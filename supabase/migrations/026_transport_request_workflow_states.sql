-- Phase 4, step 1: expand transport_requests.status from
-- Pending/Approved/Rejected into the full workflow chain:
-- DRAFT -> SUBMITTED -> DEPARTMENT_APPROVED -> TRANSPORT_APPROVED ->
-- ALLOCATED -> IN_PROGRESS -> COMPLETED, with SUBMITTED -> REJECTED
-- (and DEPARTMENT_APPROVED -> REJECTED) as the alternate path. A single
-- terminal REJECTED status is used regardless of which stage rejected
-- it — the existing rejection_reason column (plus the new rejected_by/
-- rejected_at added below) records what happened.
--
-- Option A chosen for trip linkage: trips.request_id ties an allocated
-- request to a real trip row, created by the allocation step rather
-- than kept as a separate manual action.

-- ===== Migrate existing data BEFORE changing the constraint =====
-- Old "Pending" requests were already live/submitted (there was no
-- Draft concept before) -> SUBMITTED.
-- Old "Approved" requests reached final approval under the old flat
-- model, but were never allocated a vehicle/trip -> TRANSPORT_APPROVED
-- (the last state before allocation), not ALLOCATED — allocation is a
-- new, real action (creates a trip row) that these rows never went
-- through.
-- Old "Rejected" stays REJECTED.
update public.transport_requests set status = 'SUBMITTED' where status = 'Pending';
update public.transport_requests set status = 'TRANSPORT_APPROVED' where status = 'Approved';
update public.transport_requests set status = 'REJECTED' where status = 'Rejected';

-- ===== Replace the status constraint =====
-- Drop whatever check constraint currently exists on status, whatever
-- it's actually named (avoiding another naming guess like 019/022) —
-- find it dynamically instead.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.transport_requests'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if constraint_name is not null then
    execute format('alter table public.transport_requests drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.transport_requests
  add constraint transport_requests_status_check
  check (status in (
    'DRAFT', 'SUBMITTED', 'DEPARTMENT_APPROVED', 'TRANSPORT_APPROVED',
    'ALLOCATED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'
  ));

alter table public.transport_requests
  alter column status set default 'SUBMITTED';

-- ===== Tracking columns for each transition =====
alter table public.transport_requests
  add column if not exists department_approved_by uuid references public.profiles(id),
  add column if not exists department_approved_at timestamptz,
  add column if not exists transport_approved_by uuid references public.profiles(id),
  add column if not exists transport_approved_at timestamptz,
  add column if not exists allocated_by uuid references public.profiles(id),
  add column if not exists allocated_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles(id),
  add column if not exists rejected_at timestamptz;

-- ===== Link requests to the trip they become once allocated =====
alter table public.trips
  add column if not exists request_id uuid unique references public.transport_requests(id);

-- Verify: every row should have a valid new-style status, and the
-- count of REJECTED/TRANSPORT_APPROVED/SUBMITTED should match what you'd
-- expect from the old Rejected/Approved/Pending counts.
select status, count(*) from public.transport_requests group by status;