-- Turtle Runners — removed members disappear from public surfaces
--
-- 0008 added profiles.removed_at and promised a removed member is "hidden
-- everywhere", but the two definer-rights views the landing page reads were
-- never touched:
--
--   * public_testimonials kept serving a removed member's approved quote, with
--     their name and photo, to anyone on the internet.
--   * public_week_volume counted every profile ever created as an "active
--     member".
--
-- Both are recreated with the same columns, so the app needs no change to read
-- them. Removed members' kilometres still count towards the weekly total, on
-- purpose: 0008 keeps their sessions so the club's record stays honest. Only
-- their identity and their place in the head-count go.

create or replace view public.public_testimonials
with (security_invoker = false) as
select
  t.id,
  t.text,
  t.created_at,
  p.name as author_name,
  p.avatar_url as author_avatar,
  p.sport as author_sport,
  p.level as author_level
from public.testimonials t
join public.profiles p on p.id = t.user_id
where t.status = 'approved'
  and p.removed_at is null;

create or replace view public.public_week_volume
with (security_invoker = false) as
select
  coalesce(sum(s.distance_m) filter (where s.sport = 'run'), 0)::bigint as run_m,
  coalesce(sum(s.distance_m) filter (where s.sport = 'bike'), 0)::bigint as bike_m,
  coalesce(sum(s.distance_m) filter (where s.sport = 'swim'), 0)::bigint as swim_m,
  (select count(*) from public.profiles where removed_at is null)::int as members
from public.sessions s
where s.date >= (date_trunc('week', (now() at time zone 'Asia/Kolkata')))::date;

-- create or replace keeps existing grants, but restating them keeps this file
-- correct on its own if the views are ever dropped and rebuilt.
grant select on public.public_testimonials to anon, authenticated;
grant select on public.public_week_volume to anon, authenticated;
