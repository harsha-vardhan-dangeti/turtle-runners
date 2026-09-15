-- Turtle Runners — RSVP to the weekly sessions, with pace groups
--
-- Implements docs/superpowers/specs/2026-09-14-weekly-session-rsvp-design.md,
-- with the design gaps listed in docs/2026-09-15-feature-validation-report.md
-- (section 4.2) resolved:
--
--   S1  pace_groups stays text[]. Capacities live beside it in
--       pace_group_limits, so no deployed code breaks on migration.
--   S2  The capacity check locks the parent session row first, so two members
--       cannot both take the last place.
--   S3  The guard runs on insert AND update: changing group respects capacity.
--   S4  When a group is renamed or removed, future RSVPs in it fall back to
--       "no group" rather than pointing at a group that no longer exists.
--   S5  The date is checked in the database: next occurrence only, in IST,
--       closed once the session has started, never for a paused session.
--   S6  Visitors read counts through a definer view; names are members-only.
--   S7  A session with RSVP history cannot be deleted (pause it instead), so
--       the attendance record survives.
--   S11 Removed members neither RSVP nor take up places.

-- ---------------------------------------------------------------------------
-- Capacity per pace group
-- ---------------------------------------------------------------------------
alter table public.weekly_sessions
  add column pace_group_limits jsonb not null default '{}'::jsonb
  check (jsonb_typeof(pace_group_limits) = 'object');

comment on column public.weekly_sessions.pace_group_limits is
  'Places per pace group, e.g. {"6:30+ /km": 8}. A group without an entry is unlimited.';

-- Keeps the limits honest whatever writes them: only groups the session has,
-- only whole numbers from 1 to 500.
create or replace function public.weekly_sessions_tidy_limits()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  entry record;
  tidy jsonb := '{}'::jsonb;
begin
  for entry in select key, value from jsonb_each(new.pace_group_limits) loop
    if not (entry.key = any (new.pace_groups)) then
      continue;
    end if;
    if jsonb_typeof(entry.value) <> 'number'
       or (entry.value #>> '{}')::numeric <> trunc((entry.value #>> '{}')::numeric)
       or (entry.value #>> '{}')::numeric not between 1 and 500 then
      raise exception 'Places for "%" must be a whole number from 1 to 500.', entry.key;
    end if;
    tidy := tidy || jsonb_build_object(entry.key, (entry.value #>> '{}')::int);
  end loop;
  new.pace_group_limits := tidy;
  return new;
end;
$$;

create trigger weekly_sessions_tidy_limits
  before insert or update on public.weekly_sessions
  for each row execute function public.weekly_sessions_tidy_limits();

-- ---------------------------------------------------------------------------
-- session_rsvps
-- ---------------------------------------------------------------------------
create table public.session_rsvps (
  -- restrict, not cascade: past RSVPs are the attendance record.
  weekly_session_id uuid not null references public.weekly_sessions (id) on delete restrict,
  occurs_on date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Null is a real choice: "coming, not picking a group".
  pace_group text check (pace_group is null or char_length(pace_group) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (weekly_session_id, occurs_on, user_id)
);

create index session_rsvps_group_idx
  on public.session_rsvps (weekly_session_id, occurs_on, pace_group);
create index session_rsvps_user_idx on public.session_rsvps (user_id, occurs_on desc);

comment on table public.session_rsvps is
  'Who is coming to a weekly session on a given date. Past rows are kept as the attendance record.';

-- The date a session next happens, in IST: today if it has not started yet.
-- Mirrors nextOccurrence() in lib/time.ts.
create or replace function public.session_next_occurrence(p_iso_dow smallint, p_time time)
returns date
language plpgsql
stable
set search_path = public
as $$
declare
  local_now timestamp := now() at time zone 'Asia/Kolkata';
  today date := local_now::date;
  d date := today + ((p_iso_dow - extract(isodow from today)::int + 7) % 7);
begin
  if d + p_time <= local_now then
    d := d + 7;
  end if;
  return d;
end;
$$;

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
  -- Housekeeping from another trigger (a renamed pace group clearing future
  -- RSVPs) is not a member acting, so none of the member rules apply.
  if pg_trigger_depth() > 1 then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    select * into s from public.weekly_sessions where id = old.weekly_session_id;
    if found and not public.is_admin() and old.occurs_on + s.time <= local_now then
      raise exception 'This session has already started, so your RSVP is part of the attendance record.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and (new.weekly_session_id, new.occurs_on, new.user_id)
         is distinct from (old.weekly_session_id, old.occurs_on, old.user_id) then
    raise exception 'Only the pace group of an RSVP can change.';
  end if;

  -- The lock that makes capacity safe: every RSVP write for this session
  -- queues here, so each one counts the places after the last has committed.
  select * into s from public.weekly_sessions where id = new.weekly_session_id for update;
  if not found then
    raise exception 'That session does not exist.';
  end if;
  if not s.active then
    raise exception 'This session is paused right now.';
  end if;
  if new.occurs_on <> public.session_next_occurrence(s.iso_dow, s.time) then
    raise exception 'RSVPs are open for the next session only.';
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

create trigger session_rsvps_guard
  before insert or update or delete on public.session_rsvps
  for each row execute function public.session_rsvps_guard();

-- S4: a renamed or removed pace group releases its future RSVPs to "no group".
create or replace function public.weekly_sessions_release_groups()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pace_groups is distinct from old.pace_groups then
    update public.session_rsvps
    set pace_group = null, updated_at = now()
    where weekly_session_id = new.id
      and occurs_on >= (now() at time zone 'Asia/Kolkata')::date
      and pace_group is not null
      and not (pace_group = any (new.pace_groups));
  end if;
  return new;
end;
$$;

create trigger weekly_sessions_release_groups
  after update on public.weekly_sessions
  for each row execute function public.weekly_sessions_release_groups();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.session_rsvps enable row level security;

-- Members see who is coming; that is the point. Visitors get counts only.
create policy "Members see who is coming"
  on public.session_rsvps for select
  to authenticated
  using (true);

create policy "Members RSVP for themselves"
  on public.session_rsvps for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Members change their own pace group"
  on public.session_rsvps for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Members cancel their own RSVP, admins remove anyone's"
  on public.session_rsvps for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Public read model: head-counts per session, date and group, never who
-- ---------------------------------------------------------------------------
create view public.public_session_rsvp_counts
with (security_invoker = false) as
select
  r.weekly_session_id,
  r.occurs_on,
  r.pace_group,
  count(*)::int as rsvp_count
from public.session_rsvps r
join public.profiles p on p.id = r.user_id
where p.removed_at is null
group by r.weekly_session_id, r.occurs_on, r.pace_group;

grant select on public.public_session_rsvp_counts to anon, authenticated;
