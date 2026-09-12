-- Turtle Runners — seed data
--
-- Intended for local development: `supabase db reset` runs migrations and then
-- this file. It creates fake auth users so the foreign keys line up.
--
-- On a HOSTED project, do NOT run the auth.users block: sign in with Google
-- first, then promote yourself with the snippet at the bottom of the README.
--
-- Contents: 1 admin, 4 members, 3 upcoming events (dated relative to today),
-- a handful of RSVPs, and 3 testimonials — 1 approved, 2 awaiting moderation.

-- ---------------------------------------------------------------------------
-- Auth users (local only)
--
-- No password is set: these stand in for Google accounts, so they exist purely
-- to satisfy the profiles.id foreign key.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'meera@turtlerunners.club', null, now(), '{"provider":"google","providers":["google"]}', '{"full_name":"Meera Rao"}', now() - interval '4 years', now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'harsha@turtlerunners.club', null, now(), '{"provider":"google","providers":["google"]}', '{"full_name":"Harsha Vardhan"}', now() - interval '19 months', now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'aditi@turtlerunners.club', null, now(), '{"provider":"google","providers":["google"]}', '{"full_name":"Aditi Sharma"}', now() - interval '6 months', now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'rohit@turtlerunners.club', null, now(), '{"provider":"google","providers":["google"]}', '{"full_name":"Rohit Menon"}', now() - interval '2 years', now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'zoya@turtlerunners.club', null, now(), '{"provider":"google","providers":["google"]}', '{"full_name":"Zoya Fernandes"}', now() - interval '3 years', now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Profiles (the on_auth_user_created trigger may have created these already)
-- ---------------------------------------------------------------------------
-- The on_auth_user_created trigger has already created these rows as 'member',
-- so the upsert below changes a role -- which profiles_guard_role rejects, because
-- there is no authenticated admin during seeding. Suspend the guard for this block.
alter table public.profiles disable trigger profiles_guard_role;

insert into public.profiles (id, name, avatar_url, sport, level, goal, role, joined_at)
values
  ('11111111-1111-4111-8111-111111111111', 'Meera Rao',      null, 'all',  'chasing',  'IRONMAN 70.3 Goa',    'admin',  now() - interval '4 years'),
  ('22222222-2222-4222-8222-222222222222', 'Harsha Vardhan', null, 'run',  'regular',  'Hyderabad Marathon',  'member', now() - interval '19 months'),
  ('33333333-3333-4333-8333-333333333333', 'Aditi Sharma',   null, 'swim', 'starting', null,                  'member', now() - interval '6 months'),
  ('44444444-4444-4444-8444-444444444444', 'Rohit Menon',    null, 'bike', 'racing',   'Deccan Cliffhanger',  'member', now() - interval '2 years'),
  ('55555555-5555-4555-8555-555555555555', 'Zoya Fernandes', null, 'all',  'chasing',  'IRONMAN 70.3 Goa',    'member', now() - interval '3 years')
on conflict (id) do update
set name = excluded.name,
    sport = excluded.sport,
    level = excluded.level,
    goal = excluded.goal,
    role = excluded.role,
    joined_at = excluded.joined_at;

alter table public.profiles enable trigger profiles_guard_role;

-- ---------------------------------------------------------------------------
-- Events — the next Tuesday, Thursday and Saturday session, always in future
-- ---------------------------------------------------------------------------
insert into public.events (id, title, type, date, time, location, lat, lng, note, created_by)
values
  (
    'aaaaaaaa-0001-4000-8000-000000000001',
    'Track intervals', 'run',
    current_date + ((((2 - extract(isodow from current_date)::int) + 6) % 7) + 1)::int,
    '05:45',
    'Gachibowli Athletics Stadium',
    17.446200, 78.344100,
    'Warm-up together at 5:45, main set 6:05. Bring a headlamp in winter.',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'aaaaaaaa-0002-4000-8000-000000000002',
    'Swim squad', 'swim',
    current_date + ((((4 - extract(isodow from current_date)::int) + 6) % 7) + 1)::int,
    '06:00',
    'GMC Balayogi pool, Gachibowli',
    17.446200, 78.344100,
    'Lane 1 is the learner lane and it is never empty. Coached drills, then a main set.',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'aaaaaaaa-0003-4000-8000-000000000003',
    'Long ride', 'bike',
    current_date + ((((6 - extract(isodow from current_date)::int) + 6) % 7) + 1)::int,
    '05:30',
    'ORR service roads',
    17.418000, 78.364000,
    'Rolling out sharp at 5:30 from the lake. Two groups, both regroup at every exit.',
    '11111111-1111-4111-8111-111111111111'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RSVPs
-- ---------------------------------------------------------------------------
insert into public.rsvps (event_id, user_id)
values
  ('aaaaaaaa-0001-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-0001-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222'),
  ('aaaaaaaa-0001-4000-8000-000000000001', '55555555-5555-4555-8555-555555555555'),
  ('aaaaaaaa-0002-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333'),
  ('aaaaaaaa-0002-4000-8000-000000000002', '55555555-5555-4555-8555-555555555555'),
  ('aaaaaaaa-0003-4000-8000-000000000003', '44444444-4444-4444-8444-444444444444'),
  ('aaaaaaaa-0003-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Testimonials — 1 approved, 2 waiting in the moderation queue
-- ---------------------------------------------------------------------------
insert into public.testimonials (id, user_id, text, status, created_at)
values
  (
    'bbbbbbbb-0001-4000-8000-000000000001',
    '33333333-3333-4333-8333-333333333333',
    'I could not swim one length in February. Lane 1 never once made me feel slow, and last Thursday I did 1500m without stopping.',
    'approved',
    now() - interval '41 days'
  ),
  (
    'bbbbbbbb-0002-4000-8000-000000000002',
    '44444444-4444-4444-8444-444444444444',
    'Every Saturday the fast group waits at every exit. Nobody gets dropped, nobody gets a lecture. That is the whole club in one sentence.',
    'pending',
    now() - interval '3 days'
  ),
  (
    'bbbbbbbb-0003-4000-8000-000000000003',
    '55555555-5555-4555-8555-555555555555',
    'I signed up for a 70.3 after two years of turning up on Sundays. The training was never the hard part - the group did that for me.',
    'pending',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Weekly schedule — the club's recurring rhythm, now admin-editable
-- ---------------------------------------------------------------------------
insert into public.weekly_sessions (id, iso_dow, title, type, time, location, lat, lng, note, pace_groups)
values
  (
    'cccccccc-0001-4000-8000-000000000001', 2, 'Track intervals', 'run', '05:45',
    'Gachibowli Athletics Stadium', 17.446200, 78.344100,
    'Warm-up together at 5:45, main set 6:05. Bring a headlamp in winter.',
    array['6:30+ /km', '5:45–6:30 /km', '5:00–5:45 /km', 'Sub 5:00 /km']
  ),
  (
    'cccccccc-0002-4000-8000-000000000002', 4, 'Swim squad', 'swim', '06:00',
    'GMC Balayogi pool, Gachibowli', 17.446200, 78.344100,
    'Lane 1 is the learner lane and it is never empty. Coached drills, then a main set.',
    array['Learner lane', '2:30 /100m', '2:00 /100m', 'Sub 1:45 /100m']
  ),
  (
    'cccccccc-0003-4000-8000-000000000003', 6, 'Long ride', 'bike', '05:30',
    'ORR service roads', 17.418000, 78.364000,
    'Rolling out sharp at 5:30 from the lake. Two groups, both regroup at every exit.',
    array['22–25 km/h', '25–28 km/h', '28–32 km/h', '32+ km/h']
  ),
  (
    'cccccccc-0004-4000-8000-000000000004', 7, 'Long run + monthly brick', 'run', '06:00',
    'Durgam Cheruvu Lake Front Park', 17.431100, 78.392000,
    'Long run every week. First Sunday of the month we make it a brick - ride, then run.',
    array['Walk–run', '7:00+ /km', '6:00–7:00 /km', 'Sub 6:00 /km']
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Training log — eight weeks of history so the dashboard has something to show
--
-- Deterministic rather than random: every member turns up to roughly seven in
-- ten club sessions, with distances that vary by the day of the month.
-- ---------------------------------------------------------------------------
insert into public.sessions (user_id, date, sport, title, distance_m, duration_s)
select
  user_id,
  date,
  sport,
  title,
  distance_m,
  (
    case sport
      when 'run' then round(distance_m / 1000.0 * (330 + (dom % 40)))
      when 'bike' then round(distance_m / 1000.0 * 3600.0 / (26 + (dom % 6)))
      else round(distance_m / 100.0 * (130 + (dom % 20)))
    end
  )::int as duration_s
from (
  select
    p.id as user_id,
    pl.date,
    pl.dom,
    pl.sport,
    pl.title,
    (
      case pl.sport
        when 'run' then
          case when pl.dow = 7 then 14000 + (pl.dom % 8) * 700 else 8000 + (pl.dom % 5) * 400 end
        when 'bike' then 42000 + (pl.dom % 7) * 1500
        else 1200 + (pl.dom % 6) * 100
      end
    ) as distance_m
  from public.profiles p
  cross join (
    select
      d::date as date,
      extract(isodow from d)::int as dow,
      extract(day from d)::int as dom,
      (
        case extract(isodow from d)::int
          when 2 then 'run'
          when 4 then 'swim'
          when 6 then 'bike'
          else 'run'
        end
      )::public.session_sport as sport,
      case extract(isodow from d)::int
        when 2 then 'Track intervals'
        when 4 then 'Swim squad drills'
        when 6 then 'ORR service road loop'
        else 'Sunday long run'
      end as title
    from generate_series(current_date - 56, current_date - 1, interval '1 day') d
    where extract(isodow from d)::int in (2, 4, 6, 7)
  ) pl
  -- Roughly seven sessions in ten, stable across reseeds.
  where ((pl.dom + length(p.name)) % 10) < 7
) x
on conflict do nothing;
