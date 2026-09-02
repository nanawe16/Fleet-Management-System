-- Fixes: "null value in column 'vehicle' of relation 'trips' violates
-- not-null constraint" when Transport Manager allocates a vehicle to
-- an approved request.
--
-- Cause: trips.vehicle / trips.driver (free-text, pre-017) still have
-- a NOT NULL constraint from before vehicle_id/driver_id existed.
-- Every trip created through the UI (TripForm.jsx -> tripService.js)
-- fills both the FK and the legacy text column, so this never surfaced
-- before. allocate_request() (027) creates a trip directly from
-- vehicle_id/driver_id only, with no reason to also resolve and insert
-- display text -- the FK is the actual source of truth now, and every
-- read path already prefers vehicle_id/driver_id, falling back to the
-- text columns only for old rows that predate 017. Requiring the text
-- columns at insert time serves no purpose today.

alter table public.trips alter column vehicle drop not null;
alter table public.trips alter column driver drop not null;

-- Verify after running: retry the allocation that failed. The new
-- trips row will have vehicle/driver as null and vehicle_id/driver_id
-- set -- tripService.js's toAppShape already falls back correctly
-- (row.vehicle_record?.plate_number || row.vehicle || ""), so
-- Trip Management will still display it correctly.