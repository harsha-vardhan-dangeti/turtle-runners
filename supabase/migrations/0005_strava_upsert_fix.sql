-- Fixes the Strava sync upsert.
--
-- 0004 created a PARTIAL unique index on sessions.strava_activity_id:
--
--   create unique index ... on public.sessions (strava_activity_id)
--     where strava_activity_id is not null;
--
-- Postgres will not infer a partial index as an ON CONFLICT target unless the
-- statement repeats the index predicate, and PostgREST's upsert cannot add one.
-- So every sync failed with:
--
--   42P10: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- A plain unique index is the right tool here. Postgres treats NULLs as
-- distinct in a unique index, so the many manually logged rows -- which all
-- carry a null strava_activity_id -- still coexist happily. The partial
-- version bought a marginally smaller index and cost us the upsert.

drop index if exists public.sessions_strava_activity_idx;

create unique index sessions_strava_activity_idx
  on public.sessions (strava_activity_id);
