create table public.departments (
    id uuid primary key default gen_random_uuid(),

    name text not null unique,
    manager text not null,
    phone text,
    status text not null default 'Active',

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.departments enable row level security;

-- Any signed-in user can view departments
create policy "Authenticated users can read departments"
on public.departments
for select
to authenticated
using (true);

-- Only admins can create, update, or delete departments
create policy "Admins can insert departments"
on public.departments
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

create policy "Admins can update departments"
on public.departments
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

create policy "Admins can delete departments"
on public.departments
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- Seed with your existing mock departments so the app has real data
-- to show immediately
insert into public.departments (name, manager, phone, status) values
  ('Engineering', 'Dr. Abebe', '0911111111', 'Active'),
  ('Finance', 'Mrs. Hanna', '0922222222', 'Active'),
  ('ICT', 'Mr. Samuel', '0933333333', 'Inactive');
