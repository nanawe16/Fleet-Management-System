-- Adds the missing first link in the approval chain the app was always
-- designed for but never actually let anyone use:
--   requester -> department_head -> transport_manager
--
-- Until now, only admin/transport_manager/department_head could create a
-- transport_requests row at all (009, widened in 018) -- an ordinary
-- employee had no account type that could submit their own request.
-- 017 added requested_by specifically for this ("set going forward...
-- once a real requester role exists"), and 027's submit_request()
-- function (DRAFT -> SUBMITTED) has been sitting unused since it was
-- written, for the same reason. This migration is that missing piece.
--
-- No CHECK constraint exists on profiles.role, so 'requester' is usable
-- immediately -- just needs policies. Requires profiles.department_id to
-- be set per requester (same prerequisite as department_head, per 030).

-- ===== Departments: a requester can see their own department =====
-- Needed so the request form's department dropdown resolves to
-- something -- same scoping already used for department_head/driver in
-- 030, just extended to this role too.
create policy "Requesters can read their own department"
on public.departments for select to authenticated
using (
  public.current_user_role() = 'requester'
  and id = public.current_user_department_id()
);

-- ===== Transport requests =====

-- Insert: DRAFT or SUBMITTED only, own department, self as requested_by.
-- (Unlike the existing department_head insert policy from 018, this one
-- also pins status -- a requester has no business inserting a row that's
-- already DEPARTMENT_APPROVED or further, the way a free-form insert
-- would otherwise allow.)
create policy "Requesters can create their own requests"
on public.transport_requests for insert to authenticated
with check (
  public.current_user_role() = 'requester'
  and department_id = public.current_user_department_id()
  and requested_by = auth.uid()
  and status in ('DRAFT', 'SUBMITTED')
);

-- Select: only their own requests, at any stage.
create policy "Requesters can read their own requests"
on public.transport_requests for select to authenticated
using (
  public.current_user_role() = 'requester'
  and requested_by = auth.uid()
);

-- Update: only their own requests, and only while still DRAFT -- once
-- submitted, edits go through the workflow (or the request just gets
-- rejected and they file a new one); this keeps a requester from
-- quietly changing destination/date after a Department Head has already
-- approved it.
create policy "Requesters can edit their own draft requests"
on public.transport_requests for update to authenticated
using (
  public.current_user_role() = 'requester'
  and requested_by = auth.uid()
  and status = 'DRAFT'
)
with check (
  public.current_user_role() = 'requester'
  and requested_by = auth.uid()
  and status = 'DRAFT'
);

-- No delete policy -- matrix gives requesters C/E/(submit) on their own
-- requests, not D. They can still let an unwanted DRAFT sit unsubmitted.

-- ===== Notify the requester at each decision point =====
-- Redefines the four 027 workflow functions to add one call each to the
-- existing create_notification() (extended in 034 with a specific
-- recipient) -- same pattern 034 used to notify the allocated driver,
-- just aimed at requested_by instead. Everything else about these
-- functions (role checks, status checks, tracking columns) is unchanged.

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

  if result.requested_by is not null then
    perform public.create_notification(
      'request',
      format('Your request to %s was approved by your department and is now with Transport Management.', result.destination),
      '/requests',
      null,
      null,
      result.requested_by
    );
  end if;

  return result;
end;
$$;

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

  if result.requested_by is not null then
    perform public.create_notification(
      'request',
      format('Your request to %s was rejected by your department.', result.destination),
      '/requests',
      null,
      null,
      result.requested_by
    );
  end if;

  return result;
end;
$$;

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

  if result.requested_by is not null then
    perform public.create_notification(
      'request',
      format('Your request to %s was approved by Transport Management and is awaiting vehicle allocation.', result.destination),
      '/requests',
      null,
      null,
      result.requested_by
    );
  end if;

  return result;
end;
$$;

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

  if result.requested_by is not null then
    perform public.create_notification(
      'request',
      format('Your request to %s was rejected by Transport Management.', result.destination),
      '/requests',
      null,
      null,
      result.requested_by
    );
  end if;

  return result;
end;
$$;

-- Verification guide (run as a requester test account, profile_id role
-- set to 'requester' and department_id set to a real department):
-- * select * from public.departments;  -- only their own department
-- * insert into public.transport_requests (department_id, requester, destination, request_date, status, requested_by)
--     values (<own dept id>, 'Me', 'Adama', current_date, 'DRAFT', auth.uid());  -- should succeed
-- * select public.submit_request('<the draft id above>');  -- DRAFT -> SUBMITTED
-- * select * from public.transport_requests;  -- only their own rows, any status
-- * As Department Head of that department: select public.department_approve_request('<id>');
--   -- then as the requester: select * from public.notifications;  -- approval notice should appear
-- * As Transport Manager: select public.transport_approve_request('<id>');
--   -- then as the requester: check notifications again for the second notice
