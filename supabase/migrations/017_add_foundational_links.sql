-- Phase 1 of moving toward the full permission matrix: real relational
-- links, replacing the free-text fields used until now. Old text
-- columns (vehicles.driver, trips.vehicle, trips.driver,
-- transport_requests.department) are left in place for now so nothing
-- breaks immediately — services will be updated to prefer the new
-- columns, and the text columns can be dropped later once everything
-- reads from the real relationships.

-- Links a user account to their department (needed for Dept-scoped
-- access — e.g. a Department Head only seeing their own department's
-- requests)
alter table public.profiles add column department_id uuid references public.departments(id);

-- Links a driver record to an actual login account. Without this,
-- there's no way for the database to know "this driver row belongs to
-- the person currently logged in" — which is required for every
-- Driver "Own"/"Assigned" scope in the matrix.
alter table public.drivers add column profile_id uuid unique references public.profiles(id);

-- Real vehicle-to-driver assignment, replacing the free-text name
alter table public.vehicles add column assigned_driver_id uuid references public.drivers(id);

-- Real trip-to-vehicle/driver links, replacing free-text names
alter table public.trips add column vehicle_id uuid references public.vehicles(id);
alter table public.trips add column driver_id uuid references public.drivers(id);

-- Real request-to-department link, plus who actually submitted it
-- (needed for Driver/Dept Head "Own"/"Dept" scoping on requests)
alter table public.transport_requests add column department_id uuid references public.departments(id);
alter table public.transport_requests add column requested_by uuid references public.profiles(id);

-- Best-effort backfill: match existing free-text names to real rows.
-- This only works because your seed data is small and the names/plates
-- are consistent — verify these landed correctly afterward with the
-- SELECT queries below, since a typo in the original text data (e.g.
-- "Abebe Kebede" vs "Abebe Kebde") would leave that row unmatched.

update public.vehicles v
set assigned_driver_id = d.id
from public.drivers d
where v.driver = d.name and v.assigned_driver_id is null;

update public.trips t
set vehicle_id = v.id
from public.vehicles v
where t.vehicle = v.plate_number and t.vehicle_id is null;

update public.trips t
set driver_id = d.id
from public.drivers d
where t.driver = d.name and t.driver_id is null;

update public.transport_requests r
set department_id = dpt.id
from public.departments dpt
where r.department = dpt.name and r.department_id is null;

-- requested_by and drivers.profile_id can't be backfilled — the old
-- "requester"/driver names were never tied to real login accounts.
-- These get set going forward: requested_by is set automatically by
-- the app when a new request is created (auth.uid() of whoever's
-- logged in); drivers.profile_id gets linked manually per driver via
-- the updated DriverForm (below) once that driver has a real account.

-- Verify the backfill worked — run these after the migration:
-- select plate_number, driver, assigned_driver_id from public.vehicles;
-- select vehicle, driver, vehicle_id, driver_id from public.trips;
-- select department, department_id from public.transport_requests;

-- ===== Supporting pieces for the linking UI + future scoped RLS =====

-- Returns the current user's role without triggering the
-- profiles-querying-profiles recursion problem (same reasoning as
-- is_admin() in 003) — this becomes the building block for Phase 3's
-- scoped RLS policies, so every module can check role/scope through
-- one consistent function instead of repeating subqueries everywhere.
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Transport Managers can manage drivers (per the permission matrix:
-- create/update/assign_vehicle/manage_license), which includes linking
-- a driver record to a real login account — so they need to see
-- driver-role profiles to pick from, not just their own row.
create policy "Transport managers can read driver profiles"
on public.profiles
for select
to authenticated
using (
  public.current_user_role() = 'transport_manager' and role = 'driver'
);