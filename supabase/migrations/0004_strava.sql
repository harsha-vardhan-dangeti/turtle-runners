-- Turtle Runners — Strava integration
--
-- Adds a per-member Strava connection and lets synced activities land in the
-- existing `sessions` table, so the streak, the weekly volume rings and the
-- club stats keep working without knowing where a session came from.

-- ---------------------------------------------------------------------------
-- strava_connections — one row per connected member
-- ---------------------------------------------------------------------------
create table public.strava_connections (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- Strava's athlete id. Unique: one Strava account cannot back two members.
  athlete_id bigint not null unique,
  athlete_name text,
  athlete_avatar text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.strava_connections is
  'OAuth tokens for members who linked Strava. Server-only: see the RLS note below.';

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- RLS is enabled and NO policy is created, on purpose.
--
-- Everywhere else in this schema a member may read their own rows, because the
-- browser holds the anon key and RLS is what protects the data. That rule is
-- wrong here: these rows hold live Strava bearer tokens, so a "read your own
-- connection" policy would hand a working credential to any script on the page.
--
-- With RLS on and no policies, the table is unreachable via the anon key. All
-- access goes through the service role key from the server, which never
-- reaches the browser. See lib/supabase/admin.ts.
-- ---------------------------------------------------------------------------
alter table public.strava_connections enable row level security;

-- ---------------------------------------------------------------------------
-- sessions — where a row came from
-- ---------------------------------------------------------------------------
create type public.session_source as enum ('manual', 'strava');

alter table public.sessions
  add column source public.session_source not null default 'manual',
  add column strava_activity_id bigint;

comment on column public.sessions.strava_activity_id is
  'Strava activity id for imported sessions, null for manually logged ones.';

-- Partial unique index: this is what makes a re-sync idempotent. Without it,
-- every sync would insert a fresh copy of every activity it has already seen.
create unique index sessions_strava_activity_idx
  on public.sessions (strava_activity_id)
  where strava_activity_id is not null;

-- Lets the sync find a member's existing imports without scanning.
create index sessions_user_source_idx on public.sessions (user_id, source);
