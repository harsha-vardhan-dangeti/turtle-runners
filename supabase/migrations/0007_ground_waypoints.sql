-- Remember the route points an elevation profile was generated from.
--
-- Without this an admin who wants to nudge one corner of a route has to
-- re-enter every waypoint from scratch, because only the resulting 0-1 numbers
-- were kept. Storing the source lets the profile be regenerated.

alter table public.training_grounds
  add column waypoints jsonb not null default '[]'::jsonb;

comment on column public.training_grounds.waypoints is
  'Route points as [{"lat":17.43,"lng":78.39}, ...]. Source for the elevation profile; not shown to members.';
