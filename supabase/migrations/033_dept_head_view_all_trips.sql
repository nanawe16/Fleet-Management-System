-- Changes Department Head's Trips access from "V Dept" (028) to "V"
-- (unscoped) -- same reasoning already applied to Drivers in 029: with
-- a small fleet, per-department trip scoping mostly means "usually
-- empty," not useful. Matches Vehicles and Drivers, which are now both
-- unscoped for this role.

drop policy if exists "Department heads can read their department trips" on public.trips;

create policy "Department heads can read all trips"
on public.trips for select to authenticated
using (public.current_user_role() = 'department_head');

-- Verify after running (as jo / any department_head test account):
-- select * from public.trips;  -- should now include the trip created
-- by the allocate_request() call for the "ab / fgh" request, even
-- though the assigned driver on that trip may not be linked to any
-- profile in jo's department.