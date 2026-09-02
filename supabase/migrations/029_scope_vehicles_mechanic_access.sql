-- Matrix gives Mechanic "V Assigned" on Vehicles (view only, only
-- vehicles they have a maintenance job against) -- but 018 lumped
-- mechanic into the same broad admin/transport_manager policies used
-- for full fleet management, and it was never narrowed afterward the
-- way maintenance_records was in 022. Right now a mechanic can read
-- every vehicle in the fleet, and can insert/update/delete any of
-- them via a direct API call (the frontend hides those buttons, but
-- RLS is what actually enforces it, and it currently doesn't).
--
-- "Assigned" has no direct FK on vehicles for a mechanic (unlike
-- driver's assigned_driver_id), so it's derived the same way 022
-- already scopes maintenance_records: any vehicle with at least one
-- maintenance_records row where mechanic_id = them. This includes
-- past/completed jobs too, not just open ones -- a mechanic should
-- still be able to look up a vehicle's history for work they did,
-- consistent with "F Assigned" letting them manage but not making
-- their access disappear the moment a job is marked Completed.

-- ===== Remove mechanic from the two broad "fleet staff" policies =====
drop policy if exists "Fleet staff can read all vehicles" on public.vehicles;
create policy "Fleet staff can read all vehicles"
on public.vehicles for select to authenticated
using (public.current_user_role() in ('admin', 'transport_manager'));

drop policy if exists "Fleet staff can manage vehicles" on public.vehicles;
create policy "Fleet staff can manage vehicles"
on public.vehicles for all to authenticated
using (public.current_user_role() in ('admin', 'transport_manager'))
with check (public.current_user_role() in ('admin', 'transport_manager'));

-- ===== Give mechanic a narrow, view-only, assigned-vehicle policy =====
create policy "Mechanics can read their assigned vehicles"
on public.vehicles for select to authenticated
using (
  public.current_user_role() = 'mechanic'
  and exists (
    select 1 from public.maintenance_records mr
    where mr.vehicle_id = vehicles.id
      and mr.mechanic_id = auth.uid()
  )
);

-- No insert/update/delete policy for mechanic on vehicles at all --
-- matrix gives them View only here (their write access lives on
-- maintenance_records instead, already correctly scoped in 022).

-- Verify (as a mechanic test account):
-- select plate_number from public.vehicles;
--   -- should only include vehicles with a maintenance_records row
--   -- where mechanic_id = this mechanic's auth id
-- update public.vehicles set status = 'Available' where id = '<any vehicle id>';
--   -- should affect 0 rows / be rejected, even for a vehicle they can see