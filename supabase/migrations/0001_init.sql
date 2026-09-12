-- Turtle Runners — initial schema
-- Run with `supabase db push` (linked project) or `supabase db reset` (local).
--
-- Security model: Row Level Security is the ONLY security boundary. Every
-- role check in the Next.js app is a UX affordance; the policies below are
-- what actually stop a member from editing events or publishing testimonials.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.sport as enum ('run', 'bike', 'swim', 'all');
create type public.level as enum ('starting', 'regular', 'racing', 'chasing');
create type public.user_role as enum ('member', 'admin');
create type public.event_type as enum ('run', 'bike', 'swim', 'brick', 'social');
create type public.testimonial_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  avatar_url text,
  sport public.sport not null default 'run',
  level public.level not null default 'starting',
  goal text check (goal is null or char_length(goal) <= 120),
  role public.user_role not null default 'member',
  joined_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'Never self-updatable. Guarded by the profiles_guard_role trigger and the admin update policy.';

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  type public.event_type not null,
  date date not null,
  time time not null,
  location text not null check (char_length(btrim(location)) between 1 and 160),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index events_date_time_idx on public.events (date, time);

-- ---------------------------------------------------------------------------
-- rsvps
-- ---------------------------------------------------------------------------
create table public.rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index rsvps_user_idx on public.rsvps (user_id);

-- ---------------------------------------------------------------------------
-- testimonials
-- ---------------------------------------------------------------------------
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 280),
  status public.testimonial_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index testimonials_status_idx on public.testimonials (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so that policies on `profiles` can call it without
-- recursing into their own RLS check.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- A member may edit their own profile, but never their own role.
create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change a member role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
before update on public.profiles
for each row execute function public.profiles_guard_role();

-- New Google sign-ins get a profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, 'turtle@runner'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.testimonials enable row level security;

-- profiles: readable by signed-in members, self-updatable (except role).
create policy "Profiles are readable by members"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Members insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Members update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins update any profile"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- events: world-readable, admin-writable.
create policy "Events are readable by everyone"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "Admins insert events"
  on public.events for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins update events"
  on public.events for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete events"
  on public.events for delete
  to authenticated
  using (public.is_admin());

-- rsvps: members see who is coming; anyone may only insert/delete their own.
create policy "RSVPs are readable by members"
  on public.rsvps for select
  to authenticated
  using (true);

create policy "Members RSVP for themselves"
  on public.rsvps for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Members cancel their own RSVP"
  on public.rsvps for delete
  to authenticated
  using (auth.uid() = user_id);

-- testimonials: approved ones are public, owners see their own,
-- admins see and moderate everything. Nothing auto-publishes.
create policy "Approved testimonials are public"
  on public.testimonials for select
  to anon, authenticated
  using (status = 'approved');

create policy "Owners read their own testimonials"
  on public.testimonials for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins read every testimonial"
  on public.testimonials for select
  to authenticated
  using (public.is_admin());

create policy "Members submit testimonials as pending"
  on public.testimonials for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

create policy "Admins moderate testimonials"
  on public.testimonials for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete testimonials"
  on public.testimonials for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public read models
--
-- The landing page is public, but `profiles` is deliberately members-only and
-- `rsvps` deliberately exposes who is attending. These two views are the only
-- things anonymous visitors can read: an approved quote with its author's
-- display name, and a bare RSVP head-count. They run with the definer's
-- rights (security_invoker = false, PostgreSQL 15+) precisely so they can cross that
-- boundary without widening the table policies.
-- ---------------------------------------------------------------------------
create view public.public_testimonials
with (security_invoker = false) as
select
  t.id,
  t.text,
  t.created_at,
  p.name as author_name,
  p.avatar_url as author_avatar,
  p.sport as author_sport,
  p.level as author_level
from public.testimonials t
join public.profiles p on p.id = t.user_id
where t.status = 'approved';

create view public.public_event_rsvp_counts
with (security_invoker = false) as
select e.id as event_id, count(r.user_id)::int as rsvp_count
from public.events e
left join public.rsvps r on r.event_id = e.id
group by e.id;

grant select on public.public_testimonials to anon, authenticated;
grant select on public.public_event_rsvp_counts to anon, authenticated;
