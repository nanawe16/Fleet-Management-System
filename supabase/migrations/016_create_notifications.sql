create table public.notifications (
    id uuid primary key default gen_random_uuid(),

    type text not null check (type in ('maintenance', 'insurance', 'license', 'request', 'alert')),
    message text not null,
    link text,
    -- which roles this notification is relevant to; null = everyone
    target_role text[],
    is_read boolean not null default false,

    -- lets automated checks avoid creating the same alert every run —
    -- e.g. 'license:<driver_id>:2026-09-01' so a license expiring on
    -- that date only ever generates one notification, but a renewed
    -- license (new expiry date) can generate a fresh one
    dedup_key text unique,

    created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can read notifications for their role"
on public.notifications
for select
to authenticated
using (
  target_role is null
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = any(notifications.target_role)
  )
);

create policy "Users can mark visible notifications read"
on public.notifications
for update
to authenticated
using (
  target_role is null
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = any(notifications.target_role)
  )
)
with check (true);

create policy "Users can delete visible notifications"
on public.notifications
for delete
to authenticated
using (
  target_role is null
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = any(notifications.target_role)
  )
);

-- Central insert point used by every path below (triggers, the
-- scheduled expiry check, and direct app calls) — SECURITY DEFINER so
-- it can insert regardless of the caller's own permissions, since
-- generating an operational alert isn't the same as writing arbitrary
-- data. on conflict here is what makes dedup_key actually prevent
-- duplicate spam.
create or replace function public.create_notification(
  p_type text,
  p_message text,
  p_link text,
  p_target_role text[],
  p_dedup_key text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications (type, message, link, target_role, dedup_key)
  values (p_type, p_message, p_link, p_target_role, p_dedup_key)
  on conflict (dedup_key) do nothing;
end;
$$;

-- ===== AUTOMATIC / EVENT-BASED: fires immediately when a row is created =====

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
    array['admin', 'transport_manager', 'department_head'],
    null -- each request is distinct, no dedup needed
  );
  return new;
end;
$$;

create trigger on_transport_request_created
after insert on public.transport_requests
for each row
execute function public.notify_new_transport_request();

-- ===== AUTOMATIC / SCHEDULED: daily sweep for date-based conditions =====

create or replace function public.generate_expiry_notifications()
returns void
language plpgsql
security definer
as $$
declare
  r record;
begin
  -- driver licenses expiring within 14 days
  for r in
    select id, name, license_expiry from public.drivers
    where license_expiry is not null
      and license_expiry between current_date and current_date + 14
  loop
    perform public.create_notification(
      'license',
      format('Driver %s''s license expires on %s.', r.name, r.license_expiry),
      '/drivers',
      array['admin', 'transport_manager'],
      format('license:%s:%s', r.id, r.license_expiry)
    );
  end loop;

  -- vehicle insurance expiring within 14 days
  for r in
    select id, plate_number, insurance_expiry from public.vehicles
    where insurance_expiry is not null
      and insurance_expiry between current_date and current_date + 14
  loop
    perform public.create_notification(
      'insurance',
      format('Insurance for vehicle %s expires on %s.', r.plate_number, r.insurance_expiry),
      '/vehicles',
      array['admin', 'transport_manager'],
      format('insurance:%s:%s', r.id, r.insurance_expiry)
    );
  end loop;

  -- maintenance that's scheduled but now overdue
  for r in
    select id, vehicle, service_type, record_date from public.maintenance_records
    where status = 'Scheduled' and record_date < current_date
  loop
    perform public.create_notification(
      'maintenance',
      format('%s: %s is now overdue (was due %s).', r.vehicle, r.service_type, r.record_date),
      '/maintenance',
      array['admin', 'transport_manager', 'mechanic'],
      format('maintenance:%s', r.id)
    );
  end loop;
end;
$$;

-- Run daily at 06:00 server time
select cron.schedule(
  'generate-expiry-notifications',
  '0 6 * * *',
  $$select public.generate_expiry_notifications();$$
);

-- Run it once immediately so there's something to see right away
select public.generate_expiry_notifications();