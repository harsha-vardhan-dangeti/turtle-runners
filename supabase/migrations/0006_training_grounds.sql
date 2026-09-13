-- Turtle Runners — admin-managed training grounds
--
-- The three route cards on the landing page were a hardcoded constant in
-- lib/club.ts. This moves them into Postgres under the same rules as the
-- weekly schedule: world-readable so the landing page renders for signed-out
-- visitors, admin-writable so only organisers can change them.

create table public.training_grounds (
  id uuid primary key default gen_random_uuid(),
  sport public.session_sport not null,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  subtitle text not null check (char_length(btrim(subtitle)) between 1 and 160),

  -- Three label/value pairs per card, e.g. {"Distance": "5.2 km"}. Stored as
  -- jsonb rather than columns because the labels differ per sport: a pool has
  -- lanes, a bike route has surface.
  stats jsonb not null default '[]'::jsonb,

  -- Normalised 0-1 samples that draw the self-drawing SVG line on each card.
  -- A real numeric array, so the shape is enforced here rather than in the UI.
  elevation double precision[] not null default '{}',

  -- Links out. GPX is a plain URL: it may point at /routes/*.gpx in this repo
  -- or anywhere else. File upload would need Supabase Storage.
  gpx text,
  strava text,

  -- Meeting point. Components build the map links from this.
  lat double precision,
  lng double precision,

  -- Card order on the landing page, lowest first.
  position smallint not null default 0,
  -- Lets a ground be hidden without losing it, like weekly_sessions.active.
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index training_grounds_order_idx on public.training_grounds (position, created_at);

comment on table public.training_grounds is
  'Route cards on the landing page. Empty table falls back to the defaults in lib/club.ts.';

-- Elevation must be normalised, or the SVG line escapes its viewBox.
-- `<= all(...)` is an array expression, not a subquery: Postgres rejects
-- subqueries in check constraints outright.
alter table public.training_grounds
  add constraint training_grounds_elevation_normalised
  check (
    array_length(elevation, 1) is null
    or (
      array_length(elevation, 1) between 2 and 64
      and 0 <= all (elevation)
      and 1 >= all (elevation)
    )
  );

-- ---------------------------------------------------------------------------
-- Row Level Security — same shape as weekly_sessions
-- ---------------------------------------------------------------------------
alter table public.training_grounds enable row level security;

create policy "Training grounds are readable by everyone"
  on public.training_grounds for select
  to anon, authenticated
  using (true);

create policy "Admins insert training grounds"
  on public.training_grounds for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins update training grounds"
  on public.training_grounds for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete training grounds"
  on public.training_grounds for delete
  to authenticated
  using (public.is_admin());
