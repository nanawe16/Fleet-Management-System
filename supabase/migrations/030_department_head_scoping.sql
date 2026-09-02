-- Fixes four confirmed gaps in Department Head's actual database access,
-- found by cross-checking the permission matrix against every RLS
-- policy that currently exists (none of these were ever granted, not
-- even in 018's original scoping pass):
--
--   Departments — matrix gives Dept Head "V Own" (their department
--     only), but the only read policy on this table is
--     "Authenticated users can read departments" (unscoped, everyone).
--   Vehicles    — matrix gives Dept Head "V" (all vehicles, unscoped) —
--     no policy grants them read access at all today.
--   Drivers     — matrix gives Dept Head "V Dept" (their department's
--     drivers only) — no policy grants them read access at all today.
--   Trip Management — matrix gives Dept Head "V Dept" — no policy
--     grants them read access at all today.
--
-- Also requires profiles.department_id to actually be set for each
-- Department Head — UserForm.jsx now has a Department field for this
-- role; nothing here works until that's set per user.

-- ===== Departments =====
-- Replace the single unscoped read policy with one that keeps every
-- other role's access exactly as it was (Admin/Transport Manager/
-- Mechanic/Finance/Management are all unscoped "V" per the matrix) and
-- adds real scoping only for Department Head and Driver ("V Own" for
-- both).
drop policy if exists "Authenticated users can read departments" on public.departments;

create policy "Unscoped roles can read all departments"
on public.departments for select to authenticated
using (public.current_user_role() in ('admin', 'transport_manager', 'mechanic', 'finance_officer', 'vice_president'));

create policy "Department heads can read their own department"
on public.departments for select to authenticated
using (
  public.current_user_role() = 'department_head'
  and id = public.current_user_department_id()
);

create policy "Drivers can read their own department"
on public.departments for select to authenticated
using (
  public.current_user_role() = 'driver'
  and id = (select department_id from public.profiles where id = auth.uid())
);

-- ===== Vehicles =====
-- Matrix: Dept Head "V" — unscoped, same as Finance/Management (019).
create policy "Department heads can read all vehicles"
on public.vehicles for select to authenticated
using (public.current_user_role() = 'department_head');

-- ===== Drivers =====
-- Matrix: Dept Head "V Dept" — scoped through the driver's linked
-- profile's department. Same join pattern already used for Dept Head's
-- accident_reports policy in 024. Only works for drivers actually
-- linked to a real account (drivers.profile_id set) — same limitation
-- as everywhere else this join pattern is used.
create policy "Department heads can read their department drivers"
on public.drivers for select to authenticated
using (
  public.current_user_role() = 'department_head'
  and exists (
    select 1
    from public.profiles p
    where p.id = drivers.profile_id
      and p.department_id = public.current_user_department_id()
  )
);

-- ===== Trips =====
-- Matrix: Dept Head "V Dept" — scoped through the trip's driver's
-- linked profile's department, one hop further than the drivers policy
-- above.
create policy "Department heads can read their department trips"
on public.trips for select to authenticated
using (
  public.current_user_role() = 'department_head'
  and exists (
    select 1
    from public.drivers d
    join public.profiles p on p.id = d.profile_id
    where d.id = trips.driver_id
      and p.department_id = public.current_user_department_id()
  )
);

-- Verify after running (as a Department Head test account with
-- department_id set):
-- select * from public.departments;  -- only their own department
-- select * from public.vehicles;      -- every vehicle
-- select * from public.drivers;       -- only drivers linked to a profile in their department
-- select * from public.trips;         -- only trips for drivers in their department