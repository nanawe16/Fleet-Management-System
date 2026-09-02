-- Phase 4, steps 2+3: enforce the workflow as real state transitions,
-- not just a wider set of status strings anyone with edit rights could
-- set freely. Approach:
--   - Each transition (submit, department approve/reject, transport
--     approve/reject, allocate) is its own SECURITY DEFINER function
--     that checks role + current status server-side, then performs the
--     update — same pattern as record_inventory_transaction (spare
--     parts) and verifyFuelRecord/rejectFuelRecord (fuel).
--   - A trigger blocks ANY direct status change on transport_requests
--     unless it's flagged as coming from one of these functions (via a
--     transaction-local setting), so generic edit rights (TM's "E All")
--     can't be used to skip stages.
--   - IN_PROGRESS/COMPLETED are NOT manual actions on the request —
--     they mirror the linked trip's status automatically via a second
--     trigger, since Trip Management already owns "start/complete a
--     trip" (Driver "V/E Own", Transport Manager "C/E All" on Trips).

-- ===== Guard trigger: block direct status changes =====
create or replace function public.guard_transport_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and public.current_user_role() <> 'admin'
     and coalesce(current_setting('app.allow_status_transition', true), '') <> 'true'
  then
    raise exception 'Status changes must go through the request workflow functions (submit/department_approve/transport_approve/allocate/reject), not a direct update';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_transport_request_status_change_trigger on public.transport_requests;
create trigger guard_transport_request_status_change_trigger
before update on public.transport_requests
for each row execute function public.guard_transport_request_status_change();

-- ===== RLS: replace the old combined admin+TM "manage everything" =====
-- 018 gave Admin+Transport Manager a single "for all" policy (full CRUD,
-- including delete). Matrix actually gives Transport Manager "C/E/A All"
-- — no delete. Splitting so delete stays Admin-only, matching the matrix
-- for the first time since this table was built.
drop policy if exists "Fleet managers can manage transport requests" on public.transport_requests;

create policy "Admins can manage transport requests"
on public.transport_requests for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Transport managers can create transport requests"
on public.transport_requests for insert to authenticated
with check (public.current_user_role() = 'transport_manager');

-- Non-status edits (destination, date, department). Status itself is
-- blocked by the guard trigger above unless this update is happening
-- inside one of the workflow functions below.
create policy "Transport managers can edit transport requests"
on public.transport_requests for update to authenticated
using (public.current_user_role() = 'transport_manager')
with check (public.current_user_role() = 'transport_manager');

-- (Existing "Fleet managers can read all transport requests" and the
-- Department Head read/insert policies from 018 are untouched — still
-- correct under the new status values.)

-- Department Head's existing update/delete policies from 018 let them
-- freely edit/delete their own department's requests at any stage,
-- which is wider than "approve/reject while SUBMITTED" — narrowing to
-- match the workflow: Dept Head's role in the matrix is
-- create/edit/approve, and approval should go through the function
-- below, not a free-form status edit.
drop policy if exists "Department heads can update department requests" on public.transport_requests;
drop policy if exists "Department heads can delete department requests" on public.transport_requests;

create policy "Department heads can edit their department requests"
on public.transport_requests for update to authenticated
using (
  public.current_user_role() = 'department_head'
  and department_id = public.current_user_department_id()
)
with check (
  public.current_user_role() = 'department_head'
  and department_id = public.current_user_department_id()
);
-- No delete policy re-added for Department Head — matrix gives them
-- C/E/A on this module, not D.

-- ===== Workflow transition functions =====

-- DRAFT -> SUBMITTED (not currently used by the UI, which creates
-- requests directly as SUBMITTED — included so Draft support can be
-- added later without another migration).
create or replace function public.submit_request(p_request_id uuid)
returns public.transport_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.transport_requests;
begin
  if not exists (
    select 1 from public.transport_requests
    where id = p_request_id and status = 'DRAFT' and requested_by = auth.uid()
  ) then
    raise exception 'Request must be in DRAFT status and belong to you to submit it';
  end if;

  perform set_config('app.allow_status_transition', 'true', true);
  update public.transport_requests
  set status = 'SUBMITTED'
  where id = p_request_id
  returning * into result;

  return result;
end;
$$;

-- SUBMITTED -> DEPARTMENT_APPROVED
create or replace function public.department_approve_request(p_request_id uuid)
returns public.transport_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.transport_requests;
begin
  if public.current_user_role() <> 'department_head' then
    raise exception 'Only a Department Head can approve at this stage';
  end if;

  if not exists (
    select 1 from public.transport_requests
    where id = p_request_id
      and status = 'SUBMITTED'
      and department_id = public.current_user_department_id()
  ) then
    raise exception 'Request must be SUBMITTED and in your department to approve it';
  end if;

  perform set_config('app.allow_status_transition', 'true', true);
  update public.transport_requests
  set status = 'DEPARTMENT_APPROVED',
      department_approved_by = auth.uid(),
      department_approved_at = now()
  where id = p_request_id
  returning * into result;

  return result;
end;
$$;

-- SUBMITTED -> REJECTED (department stage)
create or replace function public.department_reject_request(p_request_id uuid, p_reason text default null)
returns public.transport_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.transport_requests;
begin
  if public.current_user_role() <> 'department_head' then
    raise exception 'Only a Department Head can reject at this stage';
  end if;

  if not exists (
    select 1 from public.transport_requests
    where id = p_request_id
      and status = 'SUBMITTED'
      and department_id = public.current_user_department_id()
  ) then
    raise exception 'Request must be SUBMITTED and in your department to reject it';
  end if;

  perform set_config('app.allow_status_transition', 'true', true);
  update public.transport_requests
  set status = 'REJECTED',
      rejected_by = auth.uid(),
      rejected_at = now(),
      rejection_reason = p_reason
  where id = p_request_id
  returning * into result;

  return result;
end;
$$;

-- DEPARTMENT_APPROVED -> TRANSPORT_APPROVED
create or replace function public.transport_approve_request(p_request_id uuid)
returns public.transport_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.transport_requests;
begin
  if public.current_user_role() <> 'transport_manager' then
    raise exception 'Only a Transport Manager can approve at this stage';
  end if;

  if not exists (
    select 1 from public.transport_requests
    where id = p_request_id and status = 'DEPARTMENT_APPROVED'
  ) then
    raise exception 'Request must be DEPARTMENT_APPROVED to approve it';
  end if;

  perform set_config('app.allow_status_transition', 'true', true);
  update public.transport_requests
  set status = 'TRANSPORT_APPROVED',
      transport_approved_by = auth.uid(),
      transport_approved_at = now()
  where id = p_request_id
  returning * into result;

  return result;
end;
$$;

-- DEPARTMENT_APPROVED -> REJECTED (transport stage)
create or replace function public.transport_reject_request(p_request_id uuid, p_reason text default null)
returns public.transport_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.transport_requests;
begin
  if public.current_user_role() <> 'transport_manager' then
    raise exception 'Only a Transport Manager can reject at this stage';
  end if;

  if not exists (
    select 1 from public.transport_requests
    where id = p_request_id and status = 'DEPARTMENT_APPROVED'
  ) then
    raise exception 'Request must be DEPARTMENT_APPROVED to reject it';
  end if;

  perform set_config('app.allow_status_transition', 'true', true);
  update public.transport_requests
  set status = 'REJECTED',
      rejected_by = auth.uid(),
      rejected_at = now(),
      rejection_reason = p_reason
  where id = p_request_id
  returning * into result;

  return result;
end;
$$;

-- TRANSPORT_APPROVED -> ALLOCATED, and creates the actual trip (Option
-- A from the roadmap decision — allocation and trip creation happen
-- together, not as two separate manual steps).
create or replace function public.allocate_request(
  p_request_id uuid,
  p_vehicle_id uuid,
  p_driver_id uuid
)
returns public.transport_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.transport_requests;
  req public.transport_requests;
begin
  if public.current_user_role() <> 'transport_manager' then
    raise exception 'Only a Transport Manager can allocate a vehicle';
  end if;

  select * into req from public.transport_requests where id = p_request_id;

  if req is null or req.status <> 'TRANSPORT_APPROVED' then
    raise exception 'Request must be TRANSPORT_APPROVED to allocate a vehicle';
  end if;

  insert into public.trips (vehicle_id, driver_id, request_id, destination, start_date, end_date, status)
  values (p_vehicle_id, p_driver_id, p_request_id, req.destination, req.request_date, req.request_date, 'Scheduled');

  perform set_config('app.allow_status_transition', 'true', true);
  update public.transport_requests
  set status = 'ALLOCATED',
      allocated_by = auth.uid(),
      allocated_at = now()
  where id = p_request_id
  returning * into result;

  return result;
end;
$$;

-- ===== Mirror trip status onto the linked request =====
create or replace function public.sync_request_status_from_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.request_id is not null and new.status is distinct from old.status then
    if new.status = 'Ongoing' then
      perform set_config('app.allow_status_transition', 'true', true);
      update public.transport_requests set status = 'IN_PROGRESS' where id = new.request_id and status = 'ALLOCATED';
    elsif new.status = 'Completed' then
      perform set_config('app.allow_status_transition', 'true', true);
      update public.transport_requests set status = 'COMPLETED' where id = new.request_id and status = 'IN_PROGRESS';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_request_status_from_trip_trigger on public.trips;
create trigger sync_request_status_from_trip_trigger
after update on public.trips
for each row execute function public.sync_request_status_from_trip();

-- Verify after running:
-- select proname from pg_proc where proname like '%request%' and pronamespace = 'public'::regnamespace;
-- select tablename, policyname from pg_policies where tablename = 'transport_requests' order by policyname;