-- Turtle Runners — close two access-control gaps found in the OWASP review
--
--   1. Removal is enforced by the database, not just the app.
--
--      0008 flags a removed member, and getCurrentProfile() treats them as
--      signed out. But their Google account still authenticates, and every
--      "to authenticated" policy only asked "are you signed in?". With the
--      public anon key and their own token, a removed member could still read
--      the member list and who is coming to each session, log sessions, RSVP
--      to events and submit testimonials. Every member-facing policy now also
--      asks "are you still in the club?".
--
--   2. A member can no longer rewrite their own name or photo.
--
--      "Members update their own profile" covered every column. Nothing in the
--      app edits name or avatar_url, but the API allowed it, so a member could:
--        * point avatar_url at their own server and log the IP address of
--          everyone who sees their face: visitors on the testimonial wall,
--          members on RSVP lists and the leaderboard;
--        * rename themselves after a testimonial was approved, putting any
--          text they like on the public landing page.
--      Photos are now limited to Google's avatar host, and name, photo and
--      removed_by change only by an admin or the server.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER for the same reason as is_admin(): policies on `profiles`
-- call it, and it must not recurse into their own check.
create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and removed_at is null
  );
$$;

revoke execute on function public.is_active_member() from public;
grant execute on function public.is_active_member() to authenticated, anon;

-- Admins cannot be removed (profiles_guard_removal), so this changes nothing
-- today. It keeps a removed admin powerless if that rule is ever relaxed.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and removed_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. Removed members lose API access
-- ---------------------------------------------------------------------------

-- profiles: a removed member may still read their own row. The auth callback
-- and getCurrentProfile() read removed_at to show "you were removed" rather
-- than an endless signed-out loop.
drop policy "Profiles are readable by members" on public.profiles;
create policy "Profiles are readable by members"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_active_member());

drop policy "Members update their own profile" on public.profiles;
create policy "Members update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id and public.is_active_member())
  with check (auth.uid() = id);

-- rsvps (events)
drop policy "RSVPs are readable by members" on public.rsvps;
create policy "RSVPs are readable by members"
  on public.rsvps for select
  to authenticated
  using (public.is_active_member());

drop policy "Members RSVP for themselves" on public.rsvps;
create policy "Members RSVP for themselves"
  on public.rsvps for insert
  to authenticated
  with check (auth.uid() = user_id and public.is_active_member());

drop policy "Members cancel their own RSVP" on public.rsvps;
create policy "Members cancel their own RSVP"
  on public.rsvps for delete
  to authenticated
  using (auth.uid() = user_id and public.is_active_member());

-- testimonials
drop policy "Members submit testimonials as pending" on public.testimonials;
create policy "Members submit testimonials as pending"
  on public.testimonials for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending' and public.is_active_member());

-- sessions: reading your own log stays open; writing needs membership.
drop policy "Members log their own sessions" on public.sessions;
create policy "Members log their own sessions"
  on public.sessions for insert
  to authenticated
  with check (auth.uid() = user_id and public.is_active_member());

drop policy "Members edit their own sessions" on public.sessions;
create policy "Members edit their own sessions"
  on public.sessions for update
  to authenticated
  using (auth.uid() = user_id and public.is_active_member())
  with check (auth.uid() = user_id);

drop policy "Members delete their own sessions" on public.sessions;
create policy "Members delete their own sessions"
  on public.sessions for delete
  to authenticated
  using (auth.uid() = user_id and public.is_active_member());

-- session_rsvps: session_rsvps_guard already refuses a removed member's
-- insert and update; reading and cancelling needed the same rule.
drop policy "Members see who is coming" on public.session_rsvps;
create policy "Members see who is coming"
  on public.session_rsvps for select
  to authenticated
  using (public.is_active_member());

drop policy "Members cancel their own RSVP, admins remove anyone's" on public.session_rsvps;
create policy "Members cancel their own RSVP, admins remove anyone's"
  on public.session_rsvps for delete
  to authenticated
  using ((user_id = auth.uid() and public.is_active_member()) or public.is_admin());

-- The leaderboard is a definer view, so no table policy reaches it. It checks
-- the viewer itself. Same columns as 0014, so the app needs no change.
create or replace view public.public_leaderboard
with (security_invoker = false) as
with bounds as (
  select
    date_trunc('month', now() at time zone 'Asia/Kolkata')::date as month_start,
    (date_trunc('week', now() at time zone 'Asia/Kolkata')::date - 49) as weeks_start
)
select
  p.id as user_id,
  p.name,
  p.avatar_url,
  p.sport,
  p.level,
  coalesce(sum(s.distance_m) filter (where s.sport = 'run' and s.date >= b.month_start), 0)::bigint as run_m,
  coalesce(sum(s.distance_m) filter (where s.sport = 'bike' and s.date >= b.month_start), 0)::bigint as bike_m,
  coalesce(sum(s.distance_m) filter (where s.sport = 'swim' and s.date >= b.month_start), 0)::bigint as swim_m,
  coalesce(sum(s.distance_m) filter (where s.date >= b.month_start), 0)::bigint as total_m,
  (count(s.id) filter (where s.date >= b.month_start))::int as sessions,
  (count(distinct s.date) filter (where s.date >= b.month_start))::int as active_days,
  (count(distinct date_trunc('week', s.date)) filter (where s.date >= b.weeks_start))::int as active_weeks
from public.profiles p
cross join bounds b
left join public.sessions s
  on s.user_id = p.id
  and s.date >= least(b.month_start, b.weeks_start)
where p.show_on_leaderboard
  and p.removed_at is null
  and public.is_active_member()
group by p.id, p.name, p.avatar_url, p.sport, p.level;

revoke all on public.public_leaderboard from anon, public;
grant select on public.public_leaderboard to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Name and photo
-- ---------------------------------------------------------------------------

-- Existing photos from anywhere else fall back to initials.
update public.profiles
set avatar_url = null
where avatar_url is not null
  and avatar_url !~ '^https://lh[0-9]\.googleusercontent\.com/';

alter table public.profiles
  add constraint profiles_avatar_google
  check (avatar_url is null or avatar_url ~ '^https://lh[0-9]\.googleusercontent\.com/');

comment on column public.profiles.avatar_url is
  'Google profile photo only (lh*.googleusercontent.com). Anything else would let a member track who views their face.';

-- auth.uid() is null for the service role, migrations and the sign-up
-- trigger, which are all the server acting rather than a member.
create or replace function public.profiles_guard_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.name is distinct from old.name or new.avatar_url is distinct from old.avatar_url then
    raise exception 'Your name and photo come from your Google account';
  end if;
  if new.removed_by is distinct from old.removed_by then
    raise exception 'Only admins can remove or reinstate a member';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_identity
  before update on public.profiles
  for each row execute function public.profiles_guard_identity();

-- Sign-up metadata is whatever the client sent, and an email sign-up sends
-- its own. Keep only a Google photo, so a crafted avatar_url neither lands
-- in the table nor fails the sign-up on the constraint above.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  avatar text := new.raw_user_meta_data ->> 'avatar_url';
begin
  if avatar !~ '^https://lh[0-9]\.googleusercontent\.com/' then
    avatar := null;
  end if;

  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        split_part(coalesce(new.email, 'turtle@runner'), '@', 1)
      ),
      80
    ),
    avatar
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
