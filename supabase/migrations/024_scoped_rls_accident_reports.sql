-- Phase 3, accident_reports — completes the second slice (fuel,
-- maintenance, spare_parts/inventory_transactions were done in 022/023).
--
-- Matrix: Admin F | Transport Manager C/E All (no D) | Dept Head V Dept |
-- Driver C Own | Mechanic V Assigned | Finance — | Management V
--
-- "Mechanic: V Assigned" = can view an accident report for a vehicle
-- they currently have an open (status = 'Scheduled') maintenance job on
-- — confirmed with the user as the intended meaning, since there's no
-- direct mechanic link on accident_reports itself.
--
-- "Dept Head: V Dept" scopes via driver -> drivers.profile_id ->
-- profiles.department_id. Only works for accident reports whose driver
-- is linked to a real login account (drivers.profile_id set) — same
-- limitation as everywhere else "Own"/"Dept" scoping depends on 017's
-- backfill. Reports with an unlinked driver simply won't show for any
-- Dept Head until that driver is linked.

drop policy if exists "Authenticated users can read accident reports" on public.accident_reports;
drop policy if exists "Admins and transport managers can insert accident reports" on public.accident_reports;
drop policy if exists "Admins and transport managers can update accident reports" on public.accident_reports;
drop policy if exists "Admins and transport managers can delete accident reports" on public.accident_reports;
drop policy if exists "Admins, transport managers, and mechanics can insert accident reports" on public.accident_reports;
drop policy if exists "Admins, transport managers, and mechanics can update accident reports" on public.accident_reports;
drop policy if exists "Admins, transport managers, and mechanics can delete accident reports" on public.accident_reports;

create policy "Admins can manage accident reports"
on public.accident_reports for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- Transport Manager: create/edit everything, but no delete (matrix
-- gives "C/E All", not "F All" — delete stays Admin-only).
create policy "Transport managers can read accident reports"
on public.accident_reports for select to authenticated
using (public.current_user_role() = 'transport_manager');

create policy "Transport managers can create accident reports"
on public.accident_reports for insert to authenticated
with check (public.current_user_role() = 'transport_manager');

create policy "Transport managers can edit accident reports"
on public.accident_reports for update to authenticated
using (public.current_user_role() = 'transport_manager')
with check (public.current_user_role() = 'transport_manager');

-- Dept Head: view accidents involving drivers in their department
create policy "Department heads can read department accident reports"
on public.accident_reports for select to authenticated
using (
  public.current_user_role() = 'department_head'
  and exists (
    select 1
    from public.drivers d
    join public.profiles p on p.id = d.profile_id
    where d.id = accident_reports.driver_id
      and p.department_id = public.current_user_department_id()
  )
);

-- Driver: create only (matches Fuel/Maintenance's "C Own" pattern — no
-- view, consistent with the rest of the matrix as written)
create policy "Drivers can report their own accidents"
on public.accident_reports for insert to authenticated
with check (
  public.current_user_role() = 'driver'
  and driver_id = public.current_driver_id()
);

-- Mechanic: view accidents for vehicles they have an open maintenance
-- job on (see note above)
create policy "Mechanics can read accidents on their assigned vehicles"
on public.accident_reports for select to authenticated
using (
  public.current_user_role() = 'mechanic'
  and exists (
    select 1
    from public.maintenance_records mr
    where mr.vehicle_id = accident_reports.vehicle_id
      and mr.mechanic_id = auth.uid()
      and mr.status = 'Scheduled'
  )
);

-- Finance: no access at all per the matrix (deliberately no policy)

create policy "Management can read accident reports"
on public.accident_reports for select to authenticated
using (public.current_user_role() = 'vice_president');