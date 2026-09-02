-- Phase 3, second slice: fuel_records, maintenance_records, spare_parts,
-- inventory_transactions. accident_reports is intentionally left out of
-- this migration — the matrix's "Mechanic: V Assigned" on Accidents has
-- no clear column to scope against (no mechanic_id on accident_reports)
-- and needs a decision before it's written, not a guess.

-- ===== Fuel records =====
drop policy if exists "Authenticated users can read fuel records" on public.fuel_records;
drop policy if exists "Admins, transport managers, and finance officers can insert fuel records" on public.fuel_records;
drop policy if exists "Admins, transport managers, and finance officers can update fuel records" on public.fuel_records;
drop policy if exists "Admins, transport managers, and finance officers can delete fuel records" on public.fuel_records;

create policy "Admins can manage fuel records"
on public.fuel_records for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Transport managers can read fuel records"
on public.fuel_records for select to authenticated
using (public.current_user_role() = 'transport_manager');

create policy "Finance can read fuel records"
on public.fuel_records for select to authenticated
using (public.current_user_role() = 'finance_officer');

create policy "Management can read fuel records"
on public.fuel_records for select to authenticated
using (public.current_user_role() = 'vice_president');

-- Driver: create only (matrix gives Driver "C Own" on Fuel — no view —
-- so a driver who submits a fuel record can't see it again afterward.
-- That matches what's written; flag if that's not actually intended.)
create policy "Drivers can submit their own fuel records"
on public.fuel_records for insert to authenticated
with check (
  public.current_user_role() = 'driver'
  and driver_id = public.current_driver_id()
);

-- Finance verify/reject: a real UPDATE policy is required (not just the
-- app-level verifyFuelRecord/rejectFuelRecord functions), but a bare
-- policy can't stop Finance from also editing liters/cost/etc — RLS is
-- row-scoped, not column-scoped. The trigger below closes that gap.
create policy "Finance can update fuel record status"
on public.fuel_records for update to authenticated
using (public.current_user_role() = 'finance_officer')
with check (public.current_user_role() = 'finance_officer');

create or replace function public.restrict_finance_fuel_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() = 'finance_officer' then
    if new.vehicle_id is distinct from old.vehicle_id
      or new.driver_id is distinct from old.driver_id
      or new.fuel_type is distinct from old.fuel_type
      or new.liters is distinct from old.liters
      or new.cost is distinct from old.cost
      or new.record_date is distinct from old.record_date
    then
      raise exception 'Finance can only change status and rejection_reason on fuel records';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists restrict_finance_fuel_update_trigger on public.fuel_records;
create trigger restrict_finance_fuel_update_trigger
before update on public.fuel_records
for each row execute function public.restrict_finance_fuel_update();

-- ===== Maintenance records =====
drop policy if exists "Authenticated users can read maintenance records" on public.maintenance_records;
drop policy if exists "Admins, transport managers, and mechanics can insert maintenance records" on public.maintenance_records;
drop policy if exists "Admins, transport managers, and mechanics can update maintenance records" on public.maintenance_records;
drop policy if exists "Admins, transport managers, and mechanics can delete maintenance records" on public.maintenance_records;

create policy "Admins can manage maintenance records"
on public.maintenance_records for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- Transport Manager: "V/Schedule" — view everything, and schedule work
-- (create/update, e.g. setting date + assigning a mechanic). No delete;
-- that stays Admin-only.
create policy "Transport managers can read maintenance records"
on public.maintenance_records for select to authenticated
using (public.current_user_role() = 'transport_manager');

create policy "Transport managers can schedule maintenance"
on public.maintenance_records for insert to authenticated
with check (public.current_user_role() = 'transport_manager');

create policy "Transport managers can update maintenance scheduling"
on public.maintenance_records for update to authenticated
using (public.current_user_role() = 'transport_manager')
with check (public.current_user_role() = 'transport_manager');

-- Mechanic: "F Assigned" — full control, but only on jobs assigned to them
create policy "Mechanics can manage their assigned maintenance"
on public.maintenance_records for all to authenticated
using (
  public.current_user_role() = 'mechanic'
  and mechanic_id = auth.uid()
)
with check (
  public.current_user_role() = 'mechanic'
  and mechanic_id = auth.uid()
);

-- Driver: "C Report" — can report a problem (create only, no view/edit)
create policy "Drivers can report maintenance problems"
on public.maintenance_records for insert to authenticated
with check (public.current_user_role() = 'driver');

create policy "Finance can read maintenance records"
on public.maintenance_records for select to authenticated
using (public.current_user_role() = 'finance_officer');

create policy "Management can read maintenance records"
on public.maintenance_records for select to authenticated
using (public.current_user_role() = 'vice_president');

-- ===== Spare parts =====
drop policy if exists "Authenticated users can read spare parts" on public.spare_parts;
drop policy if exists "Admins and mechanics can insert spare parts" on public.spare_parts;
drop policy if exists "Admins and mechanics can update spare parts" on public.spare_parts;
drop policy if exists "Admins and mechanics can delete spare parts" on public.spare_parts;

create policy "Admins and mechanics can manage spare parts"
on public.spare_parts for all to authenticated
using (public.current_user_role() in ('admin', 'mechanic'))
with check (public.current_user_role() in ('admin', 'mechanic'));

create policy "Transport managers can read spare parts"
on public.spare_parts for select to authenticated
using (public.current_user_role() = 'transport_manager');

create policy "Finance can read spare parts"
on public.spare_parts for select to authenticated
using (public.current_user_role() = 'finance_officer');

create policy "Management can read spare parts"
on public.spare_parts for select to authenticated
using (public.current_user_role() = 'vice_president');

-- ===== Inventory transactions =====
-- Writes already go through record_inventory_transaction() (SECURITY
-- DEFINER, checks role internally) — this only adds/updates read access
-- to match spare_parts, since the two are viewed together.
drop policy if exists "Authenticated users can read inventory transactions" on public.inventory_transactions;

create policy "Admins and mechanics can read inventory transactions"
on public.inventory_transactions for select to authenticated
using (public.current_user_role() in ('admin', 'mechanic'));

create policy "Transport managers can read inventory transactions"
on public.inventory_transactions for select to authenticated
using (public.current_user_role() = 'transport_manager');

create policy "Finance can read inventory transactions"
on public.inventory_transactions for select to authenticated
using (public.current_user_role() = 'finance_officer');

create policy "Management can read inventory transactions"
on public.inventory_transactions for select to authenticated
using (public.current_user_role() = 'vice_president');