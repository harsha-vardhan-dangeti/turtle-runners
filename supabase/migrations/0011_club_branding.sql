-- Turtle Runners — the club's own logo
--
-- The site ships with a drawn hexagon mark (components/brand/TurtleLogo.tsx).
-- This lets an admin upload the club's real logo and switch between the two
-- without a deploy.
--
--   * club_settings holds exactly one row: whether the uploaded logo is in
--     use, and where it lives.
--   * The image itself goes in a public Storage bucket, `branding`. Public
--     because the logo is in the header of every page, signed out included;
--     only admins may write to it.
--
-- Numbered 0011 because 0010 is taken by the removed-members fix on another
-- branch.

-- ---------------------------------------------------------------------------
-- club_settings — a single row
-- ---------------------------------------------------------------------------
create table public.club_settings (
  -- A boolean key that must be true: the table can never hold a second row.
  id boolean primary key default true check (id),
  use_custom_logo boolean not null default false,
  logo_url text check (logo_url is null or char_length(logo_url) <= 500),
  -- Object path inside the bucket, so a replaced logo can be deleted.
  logo_path text check (logo_path is null or char_length(logo_path) <= 200),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  -- The switch cannot be on with nothing to show.
  constraint club_settings_logo_required check (not use_custom_logo or logo_url is not null)
);

comment on table public.club_settings is
  'Single-row club configuration. Currently the uploaded logo and whether it replaces the default mark.';

insert into public.club_settings (id) values (true) on conflict (id) do nothing;

alter table public.club_settings enable row level security;

-- Every page header reads this, signed out included.
create policy "Club settings are readable by everyone"
  on public.club_settings for select
  to anon, authenticated
  using (true);

-- No insert or delete policy: the one row is created above and never goes away.
create policy "Admins update club settings"
  on public.club_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage — the `branding` bucket
-- ---------------------------------------------------------------------------
-- Raster formats only. SVG can carry script, and a logo does not need it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files by URL without RLS, so visitors need no policy.
-- These cover the API calls the admin page makes: Storage's remove() needs
-- select as well as delete on the object.
create policy "Admins read branding objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'branding' and public.is_admin());

create policy "Admins upload branding objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'branding' and public.is_admin());

create policy "Admins update branding objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

create policy "Admins delete branding objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'branding' and public.is_admin());
