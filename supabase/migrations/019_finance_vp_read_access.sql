-- Phase 3 follow-up: migration 018 replaced "any authenticated user can
-- read" with role-scoped policies on drivers/vehicles/trips/transport_requests,
-- but only covered admin/transport_manager/mechanic/driver/department_head.
-- Finance Officer and VP/University Management were left with no read
-- policy at all on these four tables — confirmed live-broken via
-- reportService.js, which queries vehicles and transport_requests directly
-- (Total Vehicles / Pending Requests summary cards and the Requests pie
-- chart all silently return 0 for these two roles).
--
-- These roles are oversight-only: read access everywhere, no scoping,
-- no write access (unchanged from before).

create policy "Finance and VP can read drivers"
on public.drivers for select to authenticated
using (public.current_user_role() in ('finance_officer', 'vice_president'));

create policy "Finance and VP can read vehicles"
on public.vehicles for select to authenticated
using (public.current_user_role() in ('finance_officer', 'vice_president'));

create policy "Finance and VP can read trips"
on public.trips for select to authenticated
using (public.current_user_role() in ('finance_officer', 'vice_president'));

create policy "Finance and VP can read transport requests"
on public.transport_requests for select to authenticated
using (public.current_user_role() in ('finance_officer', 'vice_president'));

-- Verification (run as a finance_officer or vice_president test account):
-- select count(*) from public.vehicles;          -- should be > 0 if any exist
-- select count(*) from public.transport_requests; -- should be > 0 if any exist
-- Then reload Reports.jsx as that user and confirm Total Vehicles,
-- Pending Requests, and the Requests pie chart show real numbers.