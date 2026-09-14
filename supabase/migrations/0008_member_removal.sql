-- Turtle Runners — removing a member from the club
--
-- Deliberately a flag rather than a delete. Two reasons:
--
--   1. Deleting the profile row does not remove anyone. The app recreates a
--      profile for any authenticated user who lacks one, so a deleted member
--      reappears on their next sign-in with their history gone.
--   2. Everything hangs off the profile with `on delete cascade` — sessions,
--      RSVPs, testimonials, the Strava link. A delete erases the club's record
--      of kilometres those members actually ran.
--
-- A flag is reversible, keeps the club's totals honest, and actually sticks.

alter table public.profiles
  add column removed_at timestamptz,
  add column removed_by uuid references public.profiles (id) on delete set null;

comment on column public.profiles.removed_at is
  'Non-null means removed from the club: cannot sign in, hidden everywhere. Reversible.';

-- Most reads want active members only.
create index profiles_active_idx on public.profiles (name) where removed_at is null;

-- ---------------------------------------------------------------------------
-- Guard: only admins may remove, and admins may not be removed
-- ---------------------------------------------------------------------------
--
-- Blocking admins covers three cases in one rule: an admin cannot remove
-- themselves, cannot remove a fellow organiser, and the club can never be left
-- with nobody able to manage it. Demote to member first — which the existing
-- profiles_guard_role trigger already restricts to admins.
create or replace function public.profiles_guard_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.removed_at is distinct from old.removed_at then
    if not public.is_admin() then
      raise exception 'Only admins can remove or reinstate a member';
    end if;
    if new.removed_at is not null and old.role = 'admin' then
      raise exception 'Demote this admin to member before removing them';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_removal
  before update on public.profiles
  for each row execute function public.profiles_guard_removal();

-- A removed member must not be promoted back to admin while still removed,
-- which would then make them unremovable by the rule above.
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
  if new.role = 'admin' and new.removed_at is not null then
    raise exception 'Reinstate this member before making them an admin';
  end if;
  return new;
end;
$$;
