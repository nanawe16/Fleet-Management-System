-- Fix 1: 'management' was listed in permissions.js as a role equivalent
-- to 'vice_president', but no RLS policy anywhere has ever checked for
-- that string -- only 'vice_president' (12 policies, confirmed by
-- direct search). Any account stored with role='management' would see
-- the full UI as if it had Vice President access, while every actual
-- query silently returned nothing. Confirmed zero real accounts had
-- this role before this migration (select id, full_name from profiles
-- where role = 'management' returned no rows). permissions.js no
-- longer lists 'management' anywhere; this closes the same gap at the
-- database level so it can't come back via a direct insert, an import,
-- or a future typo -- only the roles this system actually recognizes
-- are accepted from here on.

-- Idempotent safety net -- normalizes any 'management' row to
-- 'vice_president' before the constraint goes on, in case this runs
-- against a database where that's no longer true by the time it's
-- applied.
update public.profiles set role = 'vice_president' where role = 'management';

alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'admin',
    'transport_manager',
    'department_head',
    'driver',
    'mechanic',
    'finance_officer',
    'vice_president',
    'requester'
  ));

-- From here on, handle_new_user() (001_ create_profiles.SQL) or any
-- other insert with an unrecognized role value fails loudly with a
-- constraint violation, instead of quietly creating a broken account.


-- Fix 2: strengthen the vehicle_id/driver_id backfill from
-- 020_add_fuel_maintainance_accident_links.sql. That migration matched
-- the old free-text vehicle/driver columns against
-- vehicles.plate_number / drivers.name with an exact string match --
-- anything differing only by case or stray whitespace was left
-- unlinked. This re-attempts the same backfill, case/whitespace
-- insensitively, touching only rows that are STILL unlinked (already-
-- linked rows are untouched either way).

-- ===== fuel_records =====
update public.fuel_records fr
set vehicle_id = v.id
from public.vehicles v
where fr.vehicle_id is null
  and fr.vehicle is not null
  and lower(trim(v.plate_number)) = lower(trim(fr.vehicle));

update public.fuel_records fr
set driver_id = d.id
from public.drivers d
where fr.driver_id is null
  and fr.driver is not null
  and lower(trim(d.name)) = lower(trim(fr.driver));

-- ===== maintenance_records =====
update public.maintenance_records mr
set vehicle_id = v.id
from public.vehicles v
where mr.vehicle_id is null
  and mr.vehicle is not null
  and lower(trim(v.plate_number)) = lower(trim(mr.vehicle));

-- ===== accident_reports =====
update public.accident_reports ar
set vehicle_id = v.id
from public.vehicles v
where ar.vehicle_id is null
  and ar.vehicle is not null
  and lower(trim(v.plate_number)) = lower(trim(ar.vehicle));

update public.accident_reports ar
set driver_id = d.id
from public.drivers d
where ar.driver_id is null
  and ar.driver is not null
  and lower(trim(d.name)) = lower(trim(ar.driver));

-- Anything still unlinked after this doesn't match a real
-- vehicle/driver even ignoring case and whitespace -- could be a
-- genuine typo, a vehicle/driver since removed from the system, or
-- something else that isn't safe to guess at automatically (a wrong
-- auto-match would be worse than leaving it null: it would silently
-- attribute a record to the wrong vehicle or driver). These need a
-- human to look at and either fix the source text or accept the gap.
-- Run these after applying this migration to see what's left:

-- select id, vehicle, driver, record_date from public.fuel_records where vehicle_id is null or driver_id is null;
-- select id, vehicle, record_date from public.maintenance_records where vehicle_id is null;
-- select id, vehicle, driver from public.accident_reports where vehicle_id is null or driver_id is null;