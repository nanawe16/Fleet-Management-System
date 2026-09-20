-- 045_branches_foundation.sql
--
-- Phase 1 of multi-branch support. OSU has 15 branches, each with its
-- own departments/vehicles/drivers/staff. The exact list of branches
-- isn't available yet, so this migration:
--   1. Creates the branches table
--   2. Seeds exactly ONE default branch to backfill existing data into,
--      so nothing currently in the system breaks
--   3. Adds branch_id to profiles/departments/vehicles/drivers
--   4. Adds 'super_admin' as an allowed role (cross-branch access;
--      plain 'admin' becomes branch-scoped once Phase 2's RLS lands)
-- The other 14 branches get added later through the app's own Branch
-- Management page (Admin/Super Admin only) — no migration needed for
-- that, since it's just normal data entry into this table.

-- ---------- 1. branches table ----------

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only Admin/Super Admin manage branches; everyone signed in can read
-- the list (needed to populate dropdowns in Vehicle/Driver/Department/
-- User forms regardless of which branch the viewer belongs to).
alter table branches enable row level security;

create policy "Anyone signed in can view branches"
on branches for select
to authenticated
using (true);

create policy "Admin and Super Admin manage branches"
on branches for all
to authenticated
using (current_user_role() in ('admin', 'super_admin'))
with check (current_user_role() in ('admin', 'super_admin'));

-- ---------- 2. Seed one default branch ----------
-- Every current vehicle/driver/department/profile gets assigned here so
-- existing data keeps working exactly as before. Rename or add more
-- branches later from the Branch Management page.

insert into branches (name, code, location)
values ('Main Campus', 'MAIN', 'Shashamane')
on conflict (name) do nothing;

-- ---------- 3. branch_id columns + backfill ----------

alter table profiles add column if not exists branch_id uuid references branches(id);
alter table departments add column if not exists branch_id uuid references branches(id);
alter table vehicles add column if not exists branch_id uuid references branches(id);
alter table drivers add column if not exists branch_id uuid references branches(id);

do $$
declare
  default_branch_id uuid;
begin
  select id into default_branch_id from branches where code = 'MAIN';

  update profiles set branch_id = default_branch_id where branch_id is null;
  update departments set branch_id = default_branch_id where branch_id is null;
  update vehicles set branch_id = default_branch_id where branch_id is null;
  update drivers set branch_id = default_branch_id where branch_id is null;
end $$;

-- departments/vehicles/drivers must always belong to a branch going
-- forward. profiles.branch_id stays nullable on purpose: super_admin
-- and vice_president are cross-branch roles with no single home branch.
alter table departments alter column branch_id set not null;
alter table vehicles alter column branch_id set not null;
alter table drivers alter column branch_id set not null;

-- ---------- 4. Allow the new super_admin role ----------
-- Extends 039's role lock-down rather than replacing it.

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in (
    'admin', 'super_admin', 'transport_manager', 'department_head',
    'requester', 'driver', 'mechanic', 'finance_officer', 'vice_president'
  ));

-- ---------- 5. Helper for Phase 2's branch-scoped RLS ----------
-- Mirrors current_user_role() from migration 017. Returns null for
-- super_admin/vice_president, which Phase 2's policies will read as
-- "no branch filter applies to this user."

create or replace function current_user_branch_id()
returns uuid
language sql
security definer
stable
as $$
  select branch_id from profiles where id = auth.uid();
$$;