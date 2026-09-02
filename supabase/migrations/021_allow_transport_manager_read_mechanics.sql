-- Mirrors the Phase 1 fix that let Transport Managers read driver-role
-- profiles (needed to link drivers to accounts). Same problem here:
-- MaintenanceForm needs a mechanic-assignment dropdown for Transport
-- Managers, but only Admins can currently read other users' profiles.

create policy "Transport managers can read mechanic profiles"
on public.profiles for select to authenticated
using (
  public.current_user_role() = 'transport_manager'
  and role = 'mechanic'
);