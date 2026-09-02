-- maintenance_records has no driver-identifying column at all (020 only
-- added vehicle_id/mechanic_id) — so "Drivers can report maintenance
-- problems" (022) currently lets any driver insert an unattributed
-- record, and there's no column to scope "view own" against. Fixing
-- both here: add the column, then the view-own policies for all three
-- tables (fuel/maintenance/accidents) that got "C Own" -> "V/E Own"-
-- minus-edit-delete per the user's decision.

alter table public.maintenance_records
  add column if not exists reported_by_driver_id uuid references public.drivers(id);

-- Tighten the existing insert policy so a driver reporting a problem
-- must attribute it to themselves, matching how "Drivers can submit
-- their own fuel records" and "Drivers can report their own accidents"
-- already work.
drop policy if exists "Drivers can report maintenance problems" on public.maintenance_records;

create policy "Drivers can report maintenance problems"
on public.maintenance_records for insert to authenticated
with check (
  public.current_user_role() = 'driver'
  and reported_by_driver_id = public.current_driver_id()
);

-- ===== View own (new, per user decision) =====
-- Driver still has no update/delete on any of these three — matches the
-- matrix as written (create + now view, not edit). Frontend must hide
-- Edit/Delete controls for Driver on Fuel/Maintenance/Accidents to
-- avoid showing buttons RLS will reject.

create policy "Drivers can read their own fuel records"
on public.fuel_records for select to authenticated
using (
  public.current_user_role() = 'driver'
  and driver_id = public.current_driver_id()
);

create policy "Drivers can read their own maintenance reports"
on public.maintenance_records for select to authenticated
using (
  public.current_user_role() = 'driver'
  and reported_by_driver_id = public.current_driver_id()
);

create policy "Drivers can read their own accident reports"
on public.accident_reports for select to authenticated
using (
  public.current_user_role() = 'driver'
  and driver_id = public.current_driver_id()
);