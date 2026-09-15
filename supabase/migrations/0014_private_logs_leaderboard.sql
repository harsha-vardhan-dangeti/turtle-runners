-- Turtle Runners — private training logs, and an opt-in club leaderboard
--
-- Until now any signed-in member could read every other member's sessions
-- (dates, distances, times, notes) straight from the API, while the dashboard
-- promised "your activities stay private to you". This makes the promise true
-- and adds the one thing that should be shared on purpose: a monthly board,
-- for members who choose to be on it.
--
--   1. sessions: readable by their owner and by admins only.
--   2. public_ground_activity: the per-ground club totals the landing page
--      shows, as a definer view. Visitors now see them too (they could not
--      read sessions before either).
--   3. profiles.show_on_leaderboard, off by default.
--   4. public_leaderboard: this month's totals and eight-week consistency for
--      opted-in, active members. Members only.

-- ---------------------------------------------------------------------------
-- 1. Private logs
-- ---------------------------------------------------------------------------
drop policy if exists "Sessions are readable by members" on public.sessions;

create policy "Members read their own sessions"
  on public.sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins read every session"
  on public.sessions for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Club totals per training ground, without exposing whose sessions
-- ---------------------------------------------------------------------------
create view public.public_ground_activity
with (security_invoker = false) as
select
  s.ground_id,
  count(*)::int as sessions,
  coalesce(sum(s.distance_m), 0)::bigint as distance_m
from public.sessions s
where s.ground_id is not null
group by s.ground_id;

grant select on public.public_ground_activity to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Opt-in
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column show_on_leaderboard boolean not null default false;

comment on column public.profiles.show_on_leaderboard is
  'Member chose to appear on the club leaderboard. Off by default: training stays private unless shared.';

-- ---------------------------------------------------------------------------
-- 4. The board
-- ---------------------------------------------------------------------------
create view public.public_leaderboard
with (security_invoker = false) as
with bounds as (
  select
    date_trunc('month', now() at time zone 'Asia/Kolkata')::date as month_start,
    -- Monday of the current IST week, minus seven weeks: eight weeks in all.
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
group by p.id, p.name, p.avatar_url, p.sport, p.level;

-- Members only: a visitor has no business ranking the club's members.
revoke all on public.public_leaderboard from anon, public;
grant select on public.public_leaderboard to authenticated;
