-- Optional photo/PDF evidence attached by Transport Management when
-- verifying a fuel request.

alter table public.fuel_records
  add column if not exists verification_evidence_path text,
  add column if not exists verification_evidence_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fuel-verification-evidence',
  'fuel-verification-evidence',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

create policy "Transport managers upload fuel verification evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'fuel-verification-evidence'
  and public.current_user_role() = 'transport_manager'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Transport managers and admins read fuel verification evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'fuel-verification-evidence'
  and exists (
    select 1
    from public.fuel_records fuel
    where fuel.verification_evidence_path = storage.objects.name
      and public.current_user_role() in ('admin', 'transport_manager')
  )
);

create policy "Transport managers delete their own fuel verification evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'fuel-verification-evidence'
  and public.current_user_role() = 'transport_manager'
  and (storage.foldername(name))[1] = auth.uid()::text
);

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
      or (
        (new.verification_evidence_path is distinct from old.verification_evidence_path
          or new.verification_evidence_name is distinct from old.verification_evidence_name)
        and new.status <> 'Verified'
      )
    then
      raise exception 'Transport Manager can only change verification status, rejection reason, and optional verification evidence';
    end if;

    if new.status = 'Verified' then
      new.verified_by := auth.uid();
      new.rejection_reason := null;
    end if;
  end if;
  return new;
end;
$$;
