-- Turtle Runners — logged training sessions + an editable weekly schedule
--
-- Replaces two stand-ins:
--   * lib/stats.ts generated every training number on the dashboard
--   * lib/club.ts held the weekly schedule as a hardcoded constant
--
-- Both now live in Postgres, under the same RLS rules as everything else.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- `sport` includes 'all', which is meaningful on a profile but not on a
-- session: you cannot swim, ride and run in one logged entry.
create type public.session_sport as enum ('run', 'bike', 'swim');

-- ---------------------------------------------------------------------------
-- weekly_sessions — the club's recurring rhythm, editable by admins
-- ---------------------------------------------------------------------------
create table public.weekly_sessions (
  id uuid primary key default gen_random_uuid(),
  iso_dow smallint not null check (iso_dow between 1 and 7),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  type public.event_type not null,
  time time not null,
  location text not null check (char_length(btrim(location)) between 1 and 160),
  note text check (note is null or char_length(note) <= 500),
  pace_groups text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index weekly_sessions_dow_idx on public.weekly_sessions (iso_dow, time);

comment on table public.weekly_sessions is
  'Recurring weekly sessions. Drives the landing page schedule, the ticker, and the countdown fallback when no event row is published.';

-- ---------------------------------------------------------------------------
-- sessions — what a member actually did
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  sport public.session_sport not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  -- Metres for every sport, so totals are one sum. Formatted per sport in the UI.
  distance_m integer not null check (distance_m between 1 and 1000000),
  duration_s integer not null check (duration_s between 1 and 200000),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index sessions_user_date_idx on public.sessions (user_id, date desc);
create index sessions_date_idx on public.sessions (date desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.weekly_sessions enable row level security;
alter table public.sessions enable row level security;

-- The weekly schedule is public: it renders before anyone signs in.
create policy "Weekly sessions are readable by everyone"
  on public.weekly_sessions for select
  to anon, authenticated
  using (true);

create policy "Admins insert weekly sessions"
  on public.weekly_sessions for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins update weekly sessions"
  on public.weekly_sessions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete weekly sessions"
  on public.weekly_sessions for delete
  to authenticated
  using (public.is_admin());

-- Training logs are visible to the club (that is the point of training
-- together) but only ever writable by the person who did the session.
create policy "Sessions are readable by members"
  on public.sessions for select
  to authenticated
  using (true);

create policy "Members log their own sessions"
  on public.sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Members edit their own sessions"
  on public.sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Members delete their own sessions"
  on public.sessions for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Public read model for the stats band
--
-- The landing page shows what the club covered this week to anonymous
-- visitors. `sessions` and `profiles` both stay members-only, so this
-- definer-rights view exposes four numbers and nothing else — no member, no
-- date, no session.
-- ---------------------------------------------------------------------------
create view public.public_week_volume
with (security_invoker = false) as
select
  coalesce(sum(s.distance_m) filter (where s.sport = 'run'), 0)::bigint as run_m,
  coalesce(sum(s.distance_m) filter (where s.sport = 'bike'), 0)::bigint as bike_m,
  coalesce(sum(s.distance_m) filter (where s.sport = 'swim'), 0)::bigint as swim_m,
  -- `profiles` is members-only, so an anonymous visitor counting it would get
  -- zero. The head-count rides along here instead.
  (select count(*) from public.profiles)::int as members
from public.sessions s
-- Monday-anchored week in IST, which is where every one of these happened.
where s.date >= (date_trunc('week', (now() at time zone 'Asia/Kolkata')))::date;

grant select on public.public_week_volume to anon, authenticated;
