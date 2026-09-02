-- Adds vice_president alongside admin at the two oversight notification
-- points added in 037 (department approval -> Transport Manager review,
-- and transport approval -> awaiting allocation). vice_president
-- already mirrors admin's read-only access across nearly every page in
-- permissions.js but was never included in any notification target —
-- this closes that gap the same way, by mirroring admin exactly rather
-- than introducing a new rule.

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

  perform public.create_notification(
    'request',
    format('Request from %s to %s was approved by its department and is awaiting Transport Management review.', result.requester, result.destination),
    '/requests',
    array['transport_manager', 'admin', 'vice_president'],
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

  perform public.create_notification(
    'request',
    format('Request from %s to %s was approved by Transport Management and awaits vehicle allocation.', result.requester, result.destination),
    '/requests',
    array['admin', 'vice_president'],
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

-- Verification: approve as department_head, then as transport_manager
-- -- a vice_president test account should see both oversight
-- notifications appear, same as an admin account does.