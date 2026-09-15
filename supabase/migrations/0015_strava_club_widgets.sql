-- Turtle Runners — the club's Strava widgets, and a working Strava club link
--
-- Strava gives every club two embeddable widgets (a club summary and the
-- latest activities). Their address carries a per-club token that only a
-- signed-in member can copy from Strava, so an admin pastes the embed code
-- once and it is kept here, next to the logo, in the single club_settings row.
--
-- Also: the route cards were seeded with a placeholder link,
-- strava.com/clubs/turtle-runners, which does not exist. Point them at the
-- real club.

alter table public.club_settings
  add column strava_club_id text check (strava_club_id is null or strava_club_id ~ '^[0-9]{1,20}$'),
  add column strava_widget_token text
    check (strava_widget_token is null or strava_widget_token ~ '^[A-Za-z0-9]{16,80}$'),
  -- Both halves or neither: a widget address needs the club and its token.
  add constraint club_settings_strava_widgets_complete
    check ((strava_club_id is null) = (strava_widget_token is null));

comment on column public.club_settings.strava_widget_token is
  'From Strava''s club widget embed code. Not a secret (it is in the public iframe address), but not guessable either.';

update public.training_grounds
set strava = 'https://www.strava.com/clubs/2337097'
where strava = 'https://www.strava.com/clubs/turtle-runners';
