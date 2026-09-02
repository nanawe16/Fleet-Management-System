-- Single-row table: one global settings record for the whole
-- university, not per-user or per-department.
create table public.system_settings (
    id int primary key default 1,
    org_name text not null default 'Oromia State University',
    contact_email text not null default 'fleet@osu.edu.et',
    updated_at timestamptz default now(),

    -- enforce that this table can only ever have exactly one row
    constraint single_row check (id = 1)
);

insert into public.system_settings (id, org_name, contact_email) values (1, 'Oromia State University', 'fleet@osu.edu.et');

alter table public.system_settings enable row level security;

create policy "Authenticated users can read system settings"
on public.system_settings
for select
to authenticated
using (true);

create policy "Admins can update system settings"
on public.system_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Per-user notification preferences, one row per user
create table public.notification_preferences (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    maintenance_alerts boolean not null default true,
    insurance_alerts boolean not null default true,
    license_alerts boolean not null default false,
    updated_at timestamptz default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users can read their own notification preferences"
on public.notification_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own notification preferences"
on public.notification_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own notification preferences"
on public.notification_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);