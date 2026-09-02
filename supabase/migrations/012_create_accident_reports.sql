create table public.accident_reports (
    id uuid primary key default gen_random_uuid(),

    vehicle text not null,
    driver text not null,
    incident_date date not null,
    location text not null,
    description text not null,
    severity text not null default 'Minor',
    estimated_cost numeric(12,2),
    status text not null default 'Reported',

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.accident_reports enable row level security;

create policy "Authenticated users can read accident reports"
on public.accident_reports
for select
to authenticated
using (true);

-- Matches the Sidebar's existing role restriction on the Accidents page
create policy "Admins and transport managers can insert accident reports"
on public.accident_reports
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager')
  )
);

create policy "Admins and transport managers can update accident reports"
on public.accident_reports
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

create policy "Admins and transport managers can delete accident reports"
on public.accident_reports
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager')
  )
);

-- Seed with your existing mock accident reports
insert into public.accident_reports (vehicle, driver, incident_date, location, description, severity, estimated_cost, status) values
  ('OR-67890', 'Meron Girma', '2026-07-28', 'Adama-Addis Ababa road, near Bishoftu', 'Rear-ended by another vehicle at a checkpoint stop. Minor bumper damage.', 'Minor', 8500, 'Under Review'),
  ('OR-24680', 'Dawit Alemu', '2026-07-15', 'Shashamane campus gate', 'Side mirror damaged while reversing near the gate.', 'Minor', 1200, 'Resolved');