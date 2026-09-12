-- Turtle Runners — precise meeting points
--
-- `location` is what a member reads; these two columns are where the map pin
-- and the "Get directions" button actually go. Both are optional: without a
-- pin the app searches the location text, and falls back to the club's home
-- base — see lib/maps.ts.

alter table public.events
  add column lat numeric(9, 6) check (lat is null or lat between -90 and 90),
  add column lng numeric(9, 6) check (lng is null or lng between -180 and 180);

alter table public.weekly_sessions
  add column lat numeric(9, 6) check (lat is null or lat between -90 and 90),
  add column lng numeric(9, 6) check (lng is null or lng between -180 and 180);

-- A pin is both halves or neither.
alter table public.events
  add constraint events_pin_complete check ((lat is null) = (lng is null));

alter table public.weekly_sessions
  add constraint weekly_sessions_pin_complete check ((lat is null) = (lng is null));

comment on column public.events.lat is
  'Optional meeting-point latitude. Set from the admin event form by pasting a Google Maps link or coordinates.';

-- Geocoded pins for the recurring sessions, so the map is right from the
-- first load. Admins can re-pin any of them from Admin → Schedule.
update public.weekly_sessions set lat = 17.431100, lng = 78.392000
  where location ilike '%Durgam Cheruvu%' and lat is null;

update public.weekly_sessions set lat = 17.446200, lng = 78.344100
  where location ilike '%Gachibowli%' and lat is null;

update public.weekly_sessions set lat = 17.418000, lng = 78.364000
  where location ilike '%ORR%' and lat is null;
