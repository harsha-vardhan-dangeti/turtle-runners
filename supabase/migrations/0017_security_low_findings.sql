-- Turtle Runners — the Low findings from the OWASP review
--
--   1. A profile can only ever be created as an active member.
--   2. Only the Strava sync writes Strava imports, and a logged session has
--      to be something a human could have done.
--   3. Rate limits on what a signed-in member can write, enforced here
--      because the anon key lets anyone skip the Next.js app entirely.
--   4. An append-only log of what admins did, and who did it.
--
-- Encrypting the Strava tokens (the fifth finding) happens in the app, so
-- the key never sits in the same place as the data: see lib/strava/tokens.ts.
--
-- Throughout, auth.uid() is null for the service role (the Strava sync, the
-- token backfill) and for migrations: the server acting, not a member.

-- ---------------------------------------------------------------------------
-- 1. Profile inserts
-- ---------------------------------------------------------------------------

-- The sign-up trigger creates every profile, so this policy only matters to
-- someone calling the API directly. profiles_guard_role only covers updates;
-- without this, an insert could name its own role.
drop policy "Members insert their own profile" on public.profiles;
create policy "Members insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (
    auth.uid() = id
    and role = 'member'
    and removed_at is null
    and removed_by is null
  );

-- ---------------------------------------------------------------------------
-- 3. Rate limits (defined before 2, which uses them)
-- ---------------------------------------------------------------------------

create table public.rate_limit_hits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  hit_at timestamptz not null default now()
);

create index rate_limit_hits_lookup_idx on public.rate_limit_hits (user_id, bucket, hit_at);

comment on table public.rate_limit_hits is
  'Recent writes per member and bucket, for enforce_rate_limit(). Pruned as it goes. Server-only.';

-- RLS on and no policies: nobody reads or writes this through the API.
alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

-- Refuses the write when this member has already made p_max of them inside
-- p_window. Admins and the server are exempt. The hit is recorded in the
-- same transaction as the write, so a write that fails for another reason
-- (a full pace group, say) does not count against the member.
create or replace function public.enforce_rate_limit(p_bucket text, p_max int, p_window interval)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hits int;
begin
  if uid is null or public.is_admin() then
    return;
  end if;

  -- Serialise this member's writes to this bucket, so ten parallel requests
  -- cannot all read "nine so far" and all get through.
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_bucket, 0));

  delete from public.rate_limit_hits
  where user_id = uid and bucket = p_bucket and hit_at < now() - p_window;

  select count(*) into hits
  from public.rate_limit_hits
  where user_id = uid and bucket = p_bucket;

  if hits >= p_max then
    raise exception 'You''re doing that a lot. Give it a few minutes and try again.';
  end if;

  insert into public.rate_limit_hits (user_id, bucket) values (uid, p_bucket);
end;
$$;

-- Only the triggers below call it. Called directly it could only slow the
-- caller down, but there is no reason to expose it.
revoke execute on function public.enforce_rate_limit(text, int, interval) from public, anon, authenticated;

-- Testimonials: a real member writes one, maybe two. Three a day is plenty.
create or replace function public.testimonials_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_rate_limit('testimonial', 3, interval '1 day');
  return new;
end;
$$;

create trigger testimonials_rate_limit
  before insert on public.testimonials
  for each row execute function public.testimonials_rate_limit();

-- RSVPs, event and weekly: tapping in and out a few times is normal; a
-- script flipping it hundreds of times a minute is not.
create or replace function public.rsvps_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Housekeeping from another trigger (a renamed pace group releasing its
  -- RSVPs) is not a member tapping a button.
  if pg_trigger_depth() = 1 then
    perform public.enforce_rate_limit(tg_table_name, 20, interval '10 minutes');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger rsvps_rate_limit
  before insert or delete on public.rsvps
  for each row execute function public.rsvps_rate_limit();

create trigger session_rsvps_rate_limit
  before insert or update or delete on public.session_rsvps
  for each row execute function public.rsvps_rate_limit();

-- ---------------------------------------------------------------------------
-- 2. Logged sessions
-- ---------------------------------------------------------------------------

-- Faster than any human over any distance worth logging: the 100 m world
-- record is 10.4 m/s, a flat-out sprint on a bike tops out near 20 m/s, and
-- the fastest 50 m swim is 2.4 m/s. Mirrors MAX_SPEED_MS in lib/stats.ts.
create or replace function public.session_max_speed(p_sport public.session_sport)
returns numeric
language sql
immutable
as $$
  select case p_sport when 'run' then 11 when 'bike' then 25 else 3 end::numeric;
$$;

create or replace function public.sessions_guard_member_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  -- The Strava columns belong to the sync. A member could otherwise mark a
  -- made-up session as a Strava import, or claim someone else's activity id
  -- and block it from ever importing for them.
  if tg_op = 'INSERT' then
    if new.source <> 'manual' or new.strava_activity_id is not null then
      raise exception 'Strava activities are imported by the Strava sync, not logged by hand.';
    end if;
    perform public.enforce_rate_limit('session_log', 30, interval '1 hour');
  elsif new.source is distinct from old.source
     or new.strava_activity_id is distinct from old.strava_activity_id then
    raise exception 'Strava activities are imported by the Strava sync, not logged by hand.';
  end if;

  if new.date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'That date is in the future.';
  end if;

  -- Imports keep whatever Strava recorded, GPS glitches and all.
  if new.source = 'manual'
     and new.distance_m::numeric / new.duration_s > public.session_max_speed(new.sport) then
    raise exception 'That is faster than anyone has ever gone. Check the distance and the time.';
  end if;

  return new;
end;
$$;

create trigger sessions_guard_member_writes
  before insert or update on public.sessions
  for each row execute function public.sessions_guard_member_writes();

-- ---------------------------------------------------------------------------
-- 4. Admin audit log
-- ---------------------------------------------------------------------------

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- Null when the server did it: a migration, the service role.
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_id text,
  -- Human-readable, captured at the time: a member renamed or an event
  -- deleted later still reads correctly here.
  summary text not null,
  detail jsonb not null default '{}'::jsonb
);

create index admin_audit_log_at_idx on public.admin_audit_log (at desc);

comment on table public.admin_audit_log is
  'Who changed roles, removed members, moderated testimonials, deleted or cancelled sessions. Written only by triggers; append-only.';

alter table public.admin_audit_log enable row level security;

create policy "Admins read the audit log"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin());

-- No insert, update or delete policy, and no privilege to try: rows arrive
-- only from the definer triggers below and are never edited.
revoke insert, update, delete, truncate on public.admin_audit_log from anon, authenticated;

create or replace function public.audit(
  p_action text,
  p_target_id text,
  p_summary text,
  p_detail jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.admin_audit_log (actor_id, action, target_id, summary, detail)
  values (auth.uid(), p_action, p_target_id, p_summary, coalesce(p_detail, '{}'::jsonb));
$$;

revoke execute on function public.audit(text, text, text, jsonb) from public, anon, authenticated;

-- Roles and removals.
create or replace function public.profiles_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    perform public.audit(
      case when new.role = 'admin' then 'member.promoted' else 'member.demoted' end,
      new.id::text, new.name,
      jsonb_build_object('from', old.role, 'to', new.role)
    );
  end if;
  if new.removed_at is distinct from old.removed_at then
    perform public.audit(
      case when new.removed_at is null then 'member.reinstated' else 'member.removed' end,
      new.id::text, new.name
    );
  end if;
  return new;
end;
$$;

create trigger profiles_audit
  after update on public.profiles
  for each row execute function public.profiles_audit();

-- Testimonial moderation.
create or replace function public.testimonials_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.testimonials%rowtype := case when tg_op = 'DELETE' then old else new end;
  author text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select name into author from public.profiles where id = rec.user_id;
  perform public.audit(
    case when tg_op = 'DELETE' then 'testimonial.deleted' else 'testimonial.' || new.status end,
    rec.id::text,
    coalesce(author, 'A member') || ': "' || left(rec.text, 60) || case when length(rec.text) > 60 then '…"' else '"' end
  );
  return rec;
end;
$$;

create trigger testimonials_audit
  after update or delete on public.testimonials
  for each row execute function public.testimonials_audit();

-- Deletions that lose something: an event, a weekly session, a ground.
create or replace function public.deletions_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.audit(
    case tg_table_name
      when 'events' then 'event.deleted'
      when 'weekly_sessions' then 'weekly_session.deleted'
      else 'training_ground.deleted'
    end,
    old.id::text,
    case tg_table_name
      when 'events' then old.title || ' · ' || to_char((to_jsonb(old) ->> 'date')::date, 'Dy DD Mon YYYY')
      else old.title
    end
  );
  return old;
end;
$$;

create trigger events_audit
  after delete on public.events
  for each row execute function public.deletions_audit();

create trigger weekly_sessions_audit
  after delete on public.weekly_sessions
  for each row execute function public.deletions_audit();

create trigger training_grounds_audit
  after delete on public.training_grounds
  for each row execute function public.deletions_audit();

-- An admin taking someone else off a session.
create or replace function public.session_rsvps_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member text;
  session_title text;
begin
  if auth.uid() is null or auth.uid() = old.user_id or pg_trigger_depth() > 1 then
    return old;
  end if;
  select name into member from public.profiles where id = old.user_id;
  select title into session_title from public.weekly_sessions where id = old.weekly_session_id;
  perform public.audit(
    'rsvp.removed',
    old.weekly_session_id::text,
    coalesce(member, 'A member') || ' from ' || coalesce(session_title, 'a session')
      || ' · ' || to_char(old.occurs_on, 'Dy DD Mon'),
    jsonb_build_object('user_id', old.user_id, 'occurs_on', old.occurs_on)
  );
  return old;
end;
$$;

create trigger session_rsvps_audit
  after delete on public.session_rsvps
  for each row execute function public.session_rsvps_audit();

-- Cancelling or moving one week, and undoing it.
create or replace function public.session_changes_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.session_changes%rowtype := case when tg_op = 'DELETE' then old else new end;
  session_title text;
begin
  select title into session_title from public.weekly_sessions where id = rec.weekly_session_id;
  perform public.audit(
    case when tg_op = 'DELETE' then 'session.restored' else 'session.' || rec.status end,
    rec.weekly_session_id::text,
    coalesce(session_title, 'A session') || ' · ' || to_char(rec.occurs_on, 'Dy DD Mon'),
    jsonb_strip_nulls(jsonb_build_object(
      'reason', rec.reason,
      'new_time', rec.new_time,
      'new_location', rec.new_location
    ))
  );
  return rec;
end;
$$;

create trigger session_changes_audit
  after insert or update or delete on public.session_changes
  for each row execute function public.session_changes_audit();

-- The logo and the Strava widgets: what every visitor sees.
create or replace function public.club_settings_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.use_custom_logo, new.logo_url) is distinct from (old.use_custom_logo, old.logo_url) then
    perform public.audit(
      'branding.logo',
      null,
      case
        when new.logo_url is null then 'Removed the club logo'
        when new.logo_url is distinct from old.logo_url then 'Uploaded a new club logo'
        when new.use_custom_logo then 'Switched the club logo on'
        else 'Switched back to the default logo'
      end
    );
  end if;
  if (new.strava_club_id, new.strava_widget_token) is distinct from (old.strava_club_id, old.strava_widget_token) then
    perform public.audit(
      'branding.strava_widgets',
      null,
      case when new.strava_club_id is null then 'Removed the Strava widgets' else 'Updated the Strava widgets' end
    );
  end if;
  return new;
end;
$$;

create trigger club_settings_audit
  after update on public.club_settings
  for each row execute function public.club_settings_audit();
