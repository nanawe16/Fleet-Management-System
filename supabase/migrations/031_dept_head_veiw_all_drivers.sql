-- Changes Department Head's Drivers access from "V Dept" (028) to "V"
-- (unscoped) per updated requirements — matches how Vehicles already
-- works for this role.

drop policy if exists "Department heads can read their department drivers" on public.drivers;

create policy "Department heads can read all drivers"
on public.drivers for select to authenticated
using (public.current_user_role() = 'department_head');

-- Verify after running (as a Department Head test account):
-- select * from public.drivers;  -- should now return every driver