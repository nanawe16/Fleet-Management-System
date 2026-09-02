create table public.vehicles (
    id uuid primary key default gen_random_uuid(),

    plate_number text not null unique,
    model text not null,
    type text not null,
    driver text,
    status text not null default 'Available',

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.vehicles enable row level security;

-- Any signed-in user can view vehicles (needed across Dashboard, Trips,
-- Fuel, Maintenance, and Reports for multiple roles)
create policy "Authenticated users can read vehicles"
on public.vehicles
for select
to authenticated
using (true);

-- Matches the Sidebar's existing role restriction on the Vehicles page
create policy "Admins, transport managers, and mechanics can insert vehicles"
on public.vehicles
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'mechanic')
  )
);

create policy "Admins, transport managers, and mechanics can update vehicles"
on public.vehicles
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

create policy "Admins, transport managers, and mechanics can delete vehicles"
on public.vehicles
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'mechanic')
  )
);

-- Seed with your existing mock vehicles
insert into public.vehicles (plate_number, model, type, driver, status) values
  ('OSU-001', 'Toyota Hilux', 'Pickup', 'Abebe Kebede', 'Available'),
  ('OSU-002', 'Toyota Prado', 'SUV', 'Bekele Tadesse', 'On Trip'),
  ('OSU-003', 'Isuzu Bus', 'Bus', 'Dawit Alemu', 'Maintenance');