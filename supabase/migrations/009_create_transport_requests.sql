create table public.transport_requests (
    id uuid primary key default gen_random_uuid(),

    department text not null,
    requester text not null,
    destination text not null,
    request_date date not null,
    status text not null default 'Pending',
    rejection_reason text,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.transport_requests enable row level security;

create policy "Authenticated users can read transport requests"
on public.transport_requests
for select
to authenticated
using (true);

-- Matches the Sidebar's existing role restriction on the Requests page
create policy "Admins, transport managers, and department heads can insert requests"
on public.transport_requests
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'department_head')
  )
);

create policy "Admins, transport managers, and department heads can update requests"
on public.transport_requests
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'department_head')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'department_head')
  )
);

create policy "Admins, transport managers, and department heads can delete requests"
on public.transport_requests
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'department_head')
  )
);

-- Seed with your existing mock requests
insert into public.transport_requests (department, requester, destination, request_date, status) values
  ('Engineering', 'Abebe', 'Addis Ababa', '2026-08-02', 'Pending'),
  ('ICT', 'Samuel', 'Adama', '2026-08-04', 'Approved'),
  ('Finance', 'Hanna', 'Jimma', '2026-08-06', 'Rejected');