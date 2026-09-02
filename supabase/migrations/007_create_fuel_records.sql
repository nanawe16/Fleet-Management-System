create table public.fuel_records (
    id uuid primary key default gen_random_uuid(),

    vehicle text not null,
    driver text not null,
    fuel_type text not null default 'Diesel',
    liters numeric(10,2) not null,
    cost numeric(12,2) not null,
    record_date date not null,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.fuel_records enable row level security;

-- Any signed-in user can view fuel records (Dashboard, Reports, Finance
-- Officer's cost review, etc. all need this)
create policy "Authenticated users can read fuel records"
on public.fuel_records
for select
to authenticated
using (true);

-- Matches the Sidebar's existing role restriction on the Fuel page
create policy "Admins, transport managers, and finance officers can insert fuel records"
on public.fuel_records
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'finance_officer')
  )
);

create policy "Admins, transport managers, and finance officers can update fuel records"
on public.fuel_records
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'finance_officer')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'finance_officer')
  )
);

create policy "Admins, transport managers, and finance officers can delete fuel records"
on public.fuel_records
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'finance_officer')
  )
);

-- Seed with your existing mock fuel records
insert into public.fuel_records (vehicle, driver, fuel_type, liters, cost, record_date) values
  ('OR-12345', 'Abebe', 'Diesel', 50, 4500, '2026-08-01'),
  ('OR-67890', 'Hanna', 'Petrol', 35, 3200, '2026-08-03'),
  ('OR-24680', 'Samuel', 'Diesel', 60, 5400, '2026-08-05');