-- Account to be charged for a fuel request. Nullable preserves historical
-- records; the application requires it for every new or edited request.

alter table public.fuel_records
  add column if not exists account_number text;

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
      or new.account_number is distinct from old.account_number
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
