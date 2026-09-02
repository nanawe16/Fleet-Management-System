create table public.maintenance_records (
    id uuid primary key default gen_random_uuid(),

    vehicle text not null,
    service_type text not null,
    description text,
    cost numeric(12,2) not null,
    record_date date not null,
    status text not null default 'Scheduled',

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.maintenance_records enable row level security;

create policy "Authenticated users can read maintenance records"
on public.maintenance_records
for select
to authenticated
using (true);

-- Matches the Sidebar's existing role restriction on the Maintenance page
create policy "Admins, transport managers, and mechanics can insert maintenance records"
on public.maintenance_records
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'mechanic')
  )
);

create policy "Admins, transport managers, and mechanics can update maintenance records"
on public.maintenance_records
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'mechanic')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'mechanic')
  )
);

create policy "Admins, transport managers, and mechanics can delete maintenance records"
on public.maintenance_records
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'mechanic')
  )
);

-- Seed with your existing mock maintenance records
insert into public.maintenance_records (vehicle, service_type, description, cost, record_date, status) values
  ('OR-12345', 'Oil Change', 'Engine oil replaced', 3500, '2026-08-10', 'Completed'),
  ('OR-67890', 'Brake Service', 'Brake pads replaced', 6200, '2026-08-15', 'Scheduled'),
  ('OR-24680', 'Tire Replacement', 'Front tires replaced', 9800, '2026-08-20', 'Completed');