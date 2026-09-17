-- Fuel submissions are operational requests. Transport Management, not
-- Finance, reviews and either verifies or rejects them.

drop policy if exists "Finance can update fuel record status" on public.fuel_records;

create policy "Transport managers can update fuel request status"
on public.fuel_records for update to authenticated
using (public.current_user_role() = 'transport_manager')
with check (public.current_user_role() = 'transport_manager');

drop trigger if exists restrict_finance_fuel_update_trigger on public.fuel_records;
drop function if exists public.restrict_finance_fuel_update();

create or replace function public.restrict_transport_manager_fuel_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() = 'transport_manager' then
    if old.status <> 'Pending' or new.status not in ('Verified', 'Rejected') then
      raise exception 'Transport Manager can only verify or reject a pending fuel request';
    end if;

    if new.vehicle_id is distinct from old.vehicle_id
      or new.driver_id is distinct from old.driver_id
      or new.vehicle is distinct from old.vehicle
      or new.driver is distinct from old.driver
      or new.fuel_type is distinct from old.fuel_type
      or new.liters is distinct from old.liters
      or new.cost is distinct from old.cost
      or new.record_date is distinct from old.record_date
    then
      raise exception 'Transport Manager can only change status and rejection reason on fuel requests';
    end if;

    if new.status = 'Verified' then
      new.verified_by := auth.uid();
      new.rejection_reason := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger restrict_transport_manager_fuel_update_trigger
before update on public.fuel_records
for each row execute function public.restrict_transport_manager_fuel_update();

create or replace function public.notify_new_fuel_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_notification(
    'request',
    format('New fuel request for vehicle %s from %s.', new.vehicle, new.driver),
    '/fuel',
    array['transport_manager'],
    format('fuel-request:%s', new.id)
  );
  return new;
end;
$$;

drop trigger if exists on_fuel_request_created on public.fuel_records;
create trigger on_fuel_request_created
after insert on public.fuel_records
for each row execute function public.notify_new_fuel_request();
