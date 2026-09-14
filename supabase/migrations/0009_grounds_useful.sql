-- Turtle Runners — make training grounds useful to members, not just pretty
--
-- Three changes, all aimed at the same problem: nothing on a ground card ever
-- changed, so there was no reason for a member to look at it twice.
--
--   1. Logistics and a status note — the things that actually get someone to
--      turn up, and the warning that stops them driving across Hyderabad at
--      5am for a waterlogged path.
--   2. A link from a weekly session to the ground it meets at, so each section
--      can answer the other's obvious next question, and so a location stops
--      being described twice in two admin screens.
--   3. A link from a logged session to the ground it happened at, which is
--      what turns the card into "you have run this 14 times".

-- ---------------------------------------------------------------------------
-- 1. Practical detail
-- ---------------------------------------------------------------------------
alter table public.training_grounds
  add column status_note text check (status_note is null or char_length(status_note) <= 300),
  add column meet_at text check (meet_at is null or char_length(meet_at) <= 200),
  add column parking text check (parking is null or char_length(parking) <= 200),
  add column facilities text check (facilities is null or char_length(facilities) <= 200);

comment on column public.training_grounds.status_note is
  'Short-lived warning shown prominently: waterlogged path, pool closed, road resurfacing. Clear it when it no longer applies.';
comment on column public.training_grounds.meet_at is
  'Where exactly to stand. "By the boathouse gate" beats a pin for a first-timer.';

-- ---------------------------------------------------------------------------
-- 2. A weekly session meets at a ground
-- ---------------------------------------------------------------------------
alter table public.weekly_sessions
  add column ground_id uuid references public.training_grounds (id) on delete set null;

create index weekly_sessions_ground_idx on public.weekly_sessions (ground_id);

comment on column public.weekly_sessions.ground_id is
  'Optional. When set, the session inherits the ground''s route detail and the ground shows when the club meets there.';

-- ---------------------------------------------------------------------------
-- 3. A logged session happened at a ground
-- ---------------------------------------------------------------------------
alter table public.sessions
  add column ground_id uuid references public.training_grounds (id) on delete set null;

create index sessions_ground_idx on public.sessions (ground_id) where ground_id is not null;

comment on column public.sessions.ground_id is
  'Where this training happened. Chosen when logging by hand, or matched automatically from a Strava activity''s start coordinates.';
