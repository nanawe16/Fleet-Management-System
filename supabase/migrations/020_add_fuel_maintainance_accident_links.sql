-- Phase 1 equivalent for the remaining modules: fuel_records,
-- maintenance_records, and accident_reports are still on free-text
-- vehicle/driver columns (confirmed via information_schema — no FKs
-- exist on any of the three). This adds real relational links so
-- Phase 3 RLS scoping (Driver "Own", Mechanic "Assigned", Finance
-- verify/reject) has something real to check against.
--
-- Same safety approach as 017: old free-text columns are kept for now,
-- backfill is best-effort (matches on plate_number / driver name against
-- existing seed data), and anything that doesn't match stays null for
-- manual fixing rather than guessing.

-- ===== fuel_records =====
alter table public.fuel_records
  add column if not exists vehicle_id uuid references public.vehicles(id),
  add column if not exists driver_id uuid references public.drivers(id),
  add column if not exists status text not null default 'Pending'
    check (status in ('Pending', 'Verified', 'Rejected')),
  add column if not exists verified_by uuid references public.profiles(id),
  add column if not exists rejection_reason text;

update public.fuel_records fr
set vehicle_id = v.id
from public.vehicles v
where fr.vehicle_id is null
  and fr.vehicle is not null
  and v.plate_number = fr.vehicle;

update public.fuel_records fr
set driver_id = d.id
from public.drivers d
where fr.driver_id is null
  and fr.driver is not null
  and d.name = fr.driver;

-- ===== maintenance_records =====
alter table public.maintenance_records
  add column if not exists vehicle_id uuid references public.vehicles(id),
  add column if not exists mechanic_id uuid references public.profiles(id);

update public.maintenance_records mr
set vehicle_id = v.id
from public.vehicles v
where mr.vehicle_id is null
  and mr.vehicle is not null
  and v.plate_number = mr.vehicle;

-- mechanic_id is not backfilled: existing records were never assigned to
-- a real logged-in mechanic account, same situation drivers.profile_id
-- was in before 017. Assignment goes forward from here via the Transport
-- Manager (matches the matrix: Transport Manager "V/Schedule" on
-- Maintenance includes assigning the mechanic; Mechanic itself doesn't
-- self-assign).

-- ===== accident_reports =====
alter table public.accident_reports
  add column if not exists vehicle_id uuid references public.vehicles(id),
  add column if not exists driver_id uuid references public.drivers(id);

update public.accident_reports ar
set vehicle_id = v.id
from public.vehicles v
where ar.vehicle_id is null
  and ar.vehicle is not null
  and v.plate_number = ar.vehicle;

update public.accident_reports ar
set driver_id = d.id
from public.drivers d
where ar.driver_id is null
  and ar.driver is not null
  and d.name = ar.driver;

-- ===== Verify backfill quality before moving on =====
-- Any row returned by these still needs a manual fix (typo in original
-- mock data, or a driver/vehicle that no longer exists) before Phase 3
-- RLS is written for these tables, since "Own"/"Assigned" scoping is
-- meaningless on a null link.
select id, vehicle, driver from public.fuel_records where vehicle_id is null or driver_id is null;
select id, vehicle from public.maintenance_records where vehicle_id is null;
select id, vehicle, driver from public.accident_reports where vehicle_id is null or driver_id is null;