-- Closes two gaps between the Driver matrix and the RLS actually in
-- place:
--
-- 1. Trips: 018 gave drivers SELECT ("Drivers can read their assigned
--    trips") but never an UPDATE policy, so the matrix's Driver "Edit
--    Own" on Trips was never implemented -- the frontend's Edit button
--    exists but Supabase rejects the save. Scoped the same way the
--    existing "Department heads can update department requests" policy
--    is: using() picks the row, with_check() blocks moving it out of
--    scope (a driver can't reassign a trip to another driver_id).
--
-- 2. Transport requests: no driver policy of any kind exists here, so
--    the matrix's Driver "Read Assigned" currently returns zero rows.
--    transport_requests has no driver_id column -- assignment only
--    exists once a request is allocated to a trip (trips.request_id,
--    added in 026), so scope through that link.

-- ===== Trips: Drivers can edit their own assigned trips =====
create policy "Drivers can update their assigned trips"
on public.trips for update to authenticated
using (
  public.current_user_role() = 'driver'
  and driver_id = public.current_driver_id()
)
with check (
  public.current_user_role() = 'driver'
  and driver_id = public.current_driver_id()
);

-- ===== Transport requests: Drivers can read requests assigned to them =====
create policy "Drivers can read their assigned transport requests"
on public.transport_requests for select to authenticated
using (
  public.current_user_role() = 'driver'
  and exists (
    select 1 from public.trips
    where trips.request_id = transport_requests.id
      and trips.driver_id = public.current_driver_id()
  )
);

-- Verification guide (run as a driver test account, profile_id linked
-- via the Driver form):
-- * update public.trips set destination = 'Test' where id = '<own trip id>';
--   -- should succeed
-- * update public.trips set driver_id = '<some other driver id>' where id = '<own trip id>';
--   -- should be rejected (with_check fails)
-- * select * from public.transport_requests;
--   -- should return only requests whose linked trip.driver_id is this driver
-- * As admin: select id, driver_id, request_id from public.trips where request_id is not null;
--   -- confirms which requests should be visible to which driver, to check the above against