-- Fixes three notification gaps in the requester -> department_head ->
-- transport_manager chain:
--
-- 1. A brand-new SUBMITTED request notified admin + transport_manager +
--    department_head all at once (016's original trigger). Only the
--    Department Head can act on a SUBMITTED request, so notifying the
--    other two at this stage is just noise -- narrowed to
--    department_head only.
-- 2. Department Head approval (-> DEPARTMENT_APPROVED) told the
--    requester, but told nobody that a Transport Manager now has
--    something to review -- not the Transport Manager, not Admin.
--    Added a role-targeted notification to both.
-- 3. Every rejection notice to the requester said "was rejected" with
--    no reason, even when the approver typed one into p_reason -- the
--    message just never included it. Both reject functions now append
--    it when present.

-- ===== 1. Submission notifies only the Department Head =====
create or replace function public.notify_new_transport_request()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.create_notification(
    'request',
    format('New transport request from %s (%s) to %s.', new.requester, new.department, new.destination),
    '/requests',
    array['department_head'],
    null -- each request is distinct, no dedup needed
  );
  return new;
end;
$$;
-- (trigger itself, on_transport_request_created from 016, is unchanged
-- -- it already points at this function by name.)

-- ===== 2/3. Redefine the four workflow functions =====

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

  -- Transport Manager can now act on it; Admin gets visibility too.
  perform public.create_notification(
    'request',
    format('Request from %s to %s was approved by its department and is awaiting Transport Management review.', result.requester, result.destination),
    '/requests',
    array['transport_manager', 'admin'],
    null
  );

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
      case
        when p_reason is not null and p_reason <> ''
          then format('Your request to %s was rejected by your department: %s', result.destination, p_reason)
        else format('Your request to %s was rejected by your department.', result.destination)
      end,
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

  -- Admin visibility on the final approval too, same as the
  -- department-approval step.
  perform public.create_notification(
    'request',
    format('Request from %s to %s was approved by Transport Management and awaits vehicle allocation.', result.requester, result.destination),
    '/requests',
    array['admin'],
    null
  );

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
      case
        when p_reason is not null and p_reason <> ''
          then format('Your request to %s was rejected by Transport Management: %s', result.destination, p_reason)
        else format('Your request to %s was rejected by Transport Management.', result.destination)
      end,
      '/requests',
      null,
      null,
      result.requested_by
    );
  end if;

  return result;
end;
$$;

-- Verification:
-- * Submit as a requester -> only a department_head account should see
--   the new-request notification; admin/transport_manager should not.
-- * Approve as that department_head -> transport_manager AND admin
--   should both see "awaiting Transport Management review"; the
--   requester should see their own "now with Transport Management" note.
-- * Reject (either stage) with a reason typed in -> the requester's
--   notification message should include that exact text after the colon.