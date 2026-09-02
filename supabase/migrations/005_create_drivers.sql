create table public.drivers (
    id uuid primary key default gen_random_uuid(),

    name text not null,
    license_number text not null unique,
    phone text,
    status text not null default 'Available',

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.drivers enable row level security;

-- Any signed-in user can view drivers (needed for trip assignment
-- dropdowns, dashboards, etc. across multiple pages/roles)
create policy "Authenticated users can read drivers"
on public.drivers
for select
to authenticated
using (true);

-- Only admins and transport managers can create, update, or delete
-- drivers — matches the Sidebar's existing role restriction on this page
create policy "Admins and transport managers can insert drivers"
on public.drivers
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager')
  )
);

create policy "Admins and transport managers can update drivers"
on public.drivers
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager')
  )
);

create policy "Admins and transport managers can delete drivers"
on public.drivers
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager')
  )
);

-- Seed with your existing mock drivers
insert into public.drivers (name, license_number, phone, status) values
  ('Abebe Kebede', 'DL001245', '0911223344', 'Available'),
  ('Kebede Bekele', 'DL001246', '0922334455', 'On Trip'),
  ('Mulu Getachew', 'DL001247', '0933445566', 'Leave');