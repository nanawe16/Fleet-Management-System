create table public.trips (
    id uuid primary key default gen_random_uuid(),

    vehicle text not null,
    driver text not null,
    destination text not null,
    start_date date not null,
    end_date date not null,
    status text not null default 'Scheduled',

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.trips enable row level security;

-- Any signed-in user can view trips (Drivers need to see their own
-- assigned trips; since there's no auth-user-to-driver link yet, this
-- currently means drivers can see all trips, not just theirs — worth
-- tightening once driver accounts are linked to driver records)
create policy "Authenticated users can read trips"
on public.trips
for select
to authenticated
using (true);

-- Only admins and transport managers assign/edit/cancel trips —
-- Drivers can view (via the policy above) but not modify
create policy "Admins and transport managers can insert trips"
on public.trips
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager')
  )
);

create policy "Admins and transport managers can update trips"
on public.trips
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

create policy "Admins and transport managers can delete trips"
on public.trips
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager')
  )
);

-- Seed with your existing mock trips
insert into public.trips (vehicle, driver, destination, start_date, end_date, status) values
  ('OR-12345', 'Tolla Bekele', 'Adama Campus', '2026-08-05', '2026-08-05', 'Completed'),
  ('OR-67890', 'Meron Girma', 'Addis Ababa - Ministry Meeting', '2026-08-12', '2026-08-13', 'Ongoing'),
  ('OR-24680', 'Dawit Alemu', 'Shashamane Field Visit', '2026-08-20', '2026-08-20', 'Scheduled');