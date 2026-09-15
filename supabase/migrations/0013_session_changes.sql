-- Turtle Runners — cancel or move one week of a weekly session
--
-- The schedule is a template: "Sunday 06:00 at the lake". Real weeks break
-- it: rain, a closed pool, a race the whole club is at. An admin records the
-- exception against the one date, and the template stays untouched.
--
--   cancelled  the session is not happening that date
--   moved      it is happening, at a different time and/or place
--
-- RSVPs follow: a cancelled week takes no new RSVPs, and a moved start time
-- is the one that decides when RSVPs close.

create type public.occurrence_status as enum ('cancelled', 'moved');

create table public.session_changes (
  weekly_session_id uuid not null references public.weekly_sessions (id) on delete cascade,
  occurs_on date not null,
  status public.occurrence_status not null,
  reason text check (reason is null or char_length(btrim(reason)) between 1 and 200),
  new_time time,
  new_location text check (new_location is null or char_length(btrim(new_location)) between 1 and 160),
  new_lat numeric(9, 6) check (new_lat is null or new_lat between -90 and 90),
  new_lng numeric(9, 6) check (new_lng is null or new_lng between -180 and 180),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (weekly_session_id, occurs_on),
  constraint session_changes_moved_changes_something
    check (status <> 'moved' or new_time is not null or new_location is not null),
  constraint session_changes_cancelled_is_plain
    check (status <> 'cancelled' or (new_time is null and new_location is null and new_lat is null)),
  constraint session_changes_pin_complete check ((new_lat is null) = (new_lng is null))
);

comment on table public.session_changes is
  'One-date exceptions to a weekly session: cancelled, or moved to another time or place.';

-- A change must land on a date the session actually runs, and not in the past.
create or replace function public.session_changes_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  s public.weekly_sessions%rowtype;
begin
  select * into s from public.weekly_sessions where id = new.weekly_session_id;
  if not found then
    raise exception 'That session does not exist.';
  end if;
  if extract(isodow from new.occurs_on)::int <> s.iso_dow then
    raise exception 'That date is not one this session runs on.';
  end if;
  if new.occurs_on < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'That date has already passed.';
  end if;
  return new;
end;
$$;

create trigger session_changes_guard
  before insert or update on public.session_changes
  for each row execute function public.session_changes_guard();

alter table public.session_changes enable row level security;

-- Public: a visitor needs to know Sunday is off as much as a member does.
create policy "Session changes are readable by everyone"
  on public.session_changes for select
  to anon, authenticated
  using (true);

create policy "Admins record session changes"
  on public.session_changes for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins edit session changes"
  on public.session_changes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins undo session changes"
  on public.session_changes for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Occurrence arithmetic that respects a moved start time
-- ---------------------------------------------------------------------------

-- When a given date of a session actually starts, IST wall clock.
create or replace function public.session_effective_start(p_session_id uuid, p_date date)
returns timestamp
language sql
stable
set search_path = public
as $$
  select p_date + coalesce(c.new_time, s.time)
  from public.weekly_sessions s
  left join public.session_changes c
    on c.weekly_session_id = s.id and c.occurs_on = p_date
  where s.id = p_session_id;
$$;

-- The next date of a session that has not started yet. Mirrors
-- upcomingOccurrence() in lib/occurrence.ts.
create or replace function public.session_next_occurrence(p_session_id uuid)
returns date
language plpgsql
stable
set search_path = public
as $$
declare
  s public.weekly_sessions%rowtype;
  local_now timestamp := now() at time zone 'Asia/Kolkata';
  today date := local_now::date;
  d date;
begin
  select * into s from public.weekly_sessions where id = p_session_id;
  if not found then
    return null;
  end if;
  d := today + ((s.iso_dow - extract(isodow from today)::int + 7) % 7);
  if public.session_effective_start(p_session_id, d) <= local_now then
    d := d + 7;
  end if;
  return d;
end;
$$;

-- The RSVP guard from 0012, now aware of cancelled and moved weeks.
create or replace function public.session_rsvps_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.weekly_sessions%rowtype;
  cap int;
  taken int;
  local_now timestamp := now() at time zone 'Asia/Kolkata';
begin
  if pg_trigger_depth() > 1 then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    if not public.is_admin()
       and public.session_effective_start(old.weekly_session_id, old.occurs_on) <= local_now then
      raise exception 'This session has already started, so your RSVP is part of the attendance record.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and (new.weekly_session_id, new.occurs_on, new.user_id)
         is distinct from (old.weekly_session_id, old.occurs_on, old.user_id) then
    raise exception 'Only the pace group of an RSVP can change.';
  end if;

  select * into s from public.weekly_sessions where id = new.weekly_session_id for update;
  if not found then
    raise exception 'That session does not exist.';
  end if;
  if not s.active then
    raise exception 'This session is paused right now.';
  end if;
  if new.occurs_on is distinct from public.session_next_occurrence(new.weekly_session_id) then
    raise exception 'RSVPs are open for the next session only.';
  end if;
  if exists (
    select 1 from public.session_changes
    where weekly_session_id = new.weekly_session_id
      and occurs_on = new.occurs_on
      and status = 'cancelled'
  ) then
    raise exception 'This session is cancelled that week.';
  end if;

  if exists (select 1 from public.profiles where id = new.user_id and removed_at is not null) then
    raise exception 'This account is no longer a club member.';
  end if;

  if new.pace_group is not null then
    if not (new.pace_group = any (s.pace_groups)) then
      raise exception 'That pace group is not on this session.';
    end if;

    cap := (s.pace_group_limits ->> new.pace_group)::int;
    if cap is not null and (tg_op = 'INSERT' or new.pace_group is distinct from old.pace_group) then
      select count(*) into taken
      from public.session_rsvps r
      join public.profiles p on p.id = r.user_id
      where r.weekly_session_id = new.weekly_session_id
        and r.occurs_on = new.occurs_on
        and r.pace_group = new.pace_group
        and r.user_id <> new.user_id
        and p.removed_at is null;

      if taken >= cap then
        raise exception 'The % group is full.', new.pace_group;
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- The template-only version from 0012 is superseded.
drop function if exists public.session_next_occurrence(smallint, time);
