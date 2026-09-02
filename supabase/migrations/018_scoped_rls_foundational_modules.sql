-- Phase 3, first policy slice: apply row scopes to the modules that gained
-- real ownership links in migration 017. These policies intentionally leave
-- modules that still rely on free-text relationships unchanged.
--
-- Before using department-head access, set profiles.department_id for each
-- department head. Drivers likewise need drivers.profile_id linked through
-- the Driver form before their own vehicle/trips are visible.

-- Helpers use SECURITY DEFINER because profiles/drivers are RLS-protected;
-- querying them directly from a policy would otherwise either recurse or be
-- filtered by the caller's policies. Explicit schema qualification and a
-- fixed search_path keep the definer functions predictable.
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_department_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select department_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_driver_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.drivers where profile_id = auth.uid();
$$;

-- ===== Drivers =====
drop policy if exists "Authenticated users can read drivers" on public.drivers;
drop policy if exists "Admins and transport managers can insert drivers" on public.drivers;
drop policy if exists "Admins and transport managers can update drivers" on public.drivers;
drop policy if exists "Admins and transport managers can delete drivers" on public.drivers;

-- Mechanics need the driver directory to assign a driver from the Vehicle
-- form, but only fleet managers can change driver records.
create policy "Vehicle staff can read driver directory"
on public.drivers for select to authenticated
using (public.current_user_role() in ('admin', 'transport_manager', 'mechanic'));

create policy "Drivers can read their own driver record"
on public.drivers for select to authenticated
using (profile_id = auth.uid());

create policy "Fleet managers can manage drivers"
on public.drivers for all to authenticated
using (public.current_user_role() in ('admin', 'transport_manager'))
with check (public.current_user_role() in ('admin', 'transport_manager'));

-- ===== Vehicles =====
drop policy if exists "Authenticated users can read vehicles" on public.vehicles;
drop policy if exists "Admins, transport managers, and mechanics can insert vehicles" on public.vehicles;
drop policy if exists "Admins, transport managers, and mechanics can update vehicles" on public.vehicles;
drop policy if exists "Admins, transport managers, and mechanics can delete vehicles" on public.vehicles;

create policy "Fleet staff can read all vehicles"
on public.vehicles for select to authenticated
using (public.current_user_role() in ('admin', 'transport_manager', 'mechanic'));

create policy "Drivers can read their assigned vehicles"
on public.vehicles for select to authenticated
using (assigned_driver_id = public.current_driver_id());

create policy "Fleet staff can manage vehicles"
on public.vehicles for all to authenticated
using (public.current_user_role() in ('admin', 'transport_manager', 'mechanic'))
with check (public.current_user_role() in ('admin', 'transport_manager', 'mechanic'));

-- ===== Trips =====
drop policy if exists "Authenticated users can read trips" on public.trips;
drop policy if exists "Admins and transport managers can insert trips" on public.trips;
drop policy if exists "Admins and transport managers can update trips" on public.trips;
drop policy if exists "Admins and transport managers can delete trips" on public.trips;

create policy "Fleet managers can read all trips"
on public.trips for select to authenticated
using (public.current_user_role() in ('admin', 'transport_manager'));

create policy "Drivers can read their assigned trips"
on public.trips for select to authenticated
using (driver_id = public.current_driver_id());

create policy "Fleet managers can manage trips"
on public.trips for all to authenticated
using (public.current_user_role() in ('admin', 'transport_manager'))
with check (public.current_user_role() in ('admin', 'transport_manager'));

-- ===== Transport requests =====
drop policy if exists "Authenticated users can read transport requests" on public.transport_requests;
drop policy if exists "Admins, transport managers, and department heads can insert requests" on public.transport_requests;
drop policy if exists "Admins, transport managers, and department heads can update requests" on public.transport_requests;
drop policy if exists "Admins, transport managers, and department heads can delete requests" on public.transport_requests;

create policy "Fleet managers can read all transport requests"
on public.transport_requests for select to authenticated
using (public.current_user_role() in ('admin', 'transport_manager'));

create policy "Department heads can read their department requests"
on public.transport_requests for select to authenticated
using (
  public.current_user_role() = 'department_head'
  and department_id = public.current_user_department_id()
);

create policy "Fleet managers can manage transport requests"
on public.transport_requests for all to authenticated
using (public.current_user_role() in ('admin', 'transport_manager'))
with check (public.current_user_role() in ('admin', 'transport_manager'));

create policy "Department heads can create department requests"
on public.transport_requests for insert to authenticated
with check (
  public.current_user_role() = 'department_head'
  and department_id = public.current_user_department_id()
  and requested_by = auth.uid()
);

create policy "Department heads can update department requests"
on public.transport_requests for update to authenticated
using (
  public.current_user_role() = 'department_head'
  and department_id = public.current_user_department_id()
)
with check (
  public.current_user_role() = 'department_head'
  and department_id = public.current_user_department_id()
);

create policy "Department heads can delete department requests"
on public.transport_requests for delete to authenticated
using (
  public.current_user_role() = 'department_head'
  and department_id = public.current_user_department_id()
);

-- Verification guide (run as each representative authenticated user):
-- * Driver: select * from public.trips; -- only linked driver_id rows
-- * Driver: select * from public.vehicles; -- only assigned vehicle rows
-- * Department head: select * from public.transport_requests; -- own department
-- * Department head: insert into public.transport_requests (...);
--   -- must use their department_id and auth.uid() as requested_by
