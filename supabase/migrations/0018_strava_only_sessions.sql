-- Turtle Runners — training comes from Strava only
--
-- Hand-logged sessions let a member type any distance they liked, and the
-- leaderboard took them at their word. The dashboard no longer offers
-- "Log a session", and this makes the database agree, since the anon key
-- lets anyone write through the API without the dashboard:
--
--   1. Members can no longer insert sessions. Rows arrive only from the
--      Strava sync, which uses the service role.
--   2. Members can no longer edit sessions either. The old policy allowed
--      rewriting distance_m on a Strava import, which is the same exploit.
--      Deleting your own sessions stays allowed: it cannot move anyone up.
--   3. The leaderboard counts Strava imports only, so sessions typed in
--      before today cannot keep anyone on top. They stay in the member's own
--      history, and still count toward their private streak and rings.

drop policy if exists "Members log their own sessions" on public.sessions;
drop policy if exists "Members edit their own sessions" on public.sessions;

-- Same columns as 0016, so the app needs no change to read it.
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
  and s.source = 'strava'
  and s.date >= least(b.month_start, b.weeks_start)
where p.show_on_leaderboard
  and p.removed_at is null
  and public.is_active_member()
group by p.id, p.name, p.avatar_url, p.sport, p.level;

revoke all on public.public_leaderboard from anon, public;
grant select on public.public_leaderboard to authenticated;
