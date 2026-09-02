-- Fixes: a driver gets no notification when a Transport Manager
-- allocates them to a request (only the request-creation notification
-- exists, targeted at Admin/Transport Manager/Department Head — see
-- 016). Confirmed there is currently no way to target a SPECIFIC
-- person at all: notifications only supports target_role (broadcast
-- to every user with that role), so a naive fix would notify every
-- driver in the system, not just the one actually assigned.

-- ===== Add a specific-recipient option alongside target_role =====
alter table public.notifications
  add column if not exists recipient_user_id uuid references public.profiles(id);

-- Extend all three existing policies to also match on
-- recipient_user_id, in addition to the existing target_role check.
drop policy if exists "Users can read notifications for their role" on public.notifications;
drop policy if exists "Users can mark visible notifications read" on public.notifications;
drop policy if exists "Users can delete visible notifications" on public.notifications;

create policy "Users can read their notifications"
on public.notifications for select to authenticated
using (
  recipient_user_id = auth.uid()
  or target_role is null
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = any(notifications.target_role)
  )
);

create policy "Users can mark their visible notifications read"
on public.notifications for update to authenticated
using (
  recipient_user_id = auth.uid()
  or target_role is null
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = any(notifications.target_role)
  )
)
with check (true);

create policy "Users can delete their visible notifications"
on public.notifications for delete to authenticated
using (
  recipient_user_id = auth.uid()
  or target_role is null
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = any(notifications.target_role)
  )
);

-- Extend create_notification() with an optional recipient — existing
-- callers (the request-creation trigger, the expiry scan,
-- notifyRoles() in notificationService.js) keep working unchanged
-- since the new parameter defaults to null.
create or replace function public.create_notification(
  p_type text,
  p_message text,
  p_link text,
  p_target_role text[],
  p_dedup_key text default null,
  p_recipient_user_id uuid default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications (type, message, link, target_role, dedup_key, recipient_user_id)
  values (p_type, p_message, p_link, p_target_role, p_dedup_key, p_recipient_user_id)
  on conflict (dedup_key) do nothing;
end;
$$;

-- ===== Notify the assigned driver on allocation =====
-- allocate_request() (027) creates the trip and moves the request to
-- ALLOCATED in one call; this trigger fires right after that insert
-- and looks up the driver's own profile id (via drivers.profile_id) to
-- notify only them.
create or replace function public.notify_driver_on_trip_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  driver_profile_id uuid;
begin
  if new.driver_id is not null then
    select profile_id into driver_profile_id from public.drivers where id = new.driver_id;

    if driver_profile_id is not null then
      perform public.create_notification(
        'request',
        format('You have been assigned a trip to %s on %s.', new.destination, new.start_date),
        '/requests',
        null,
        null, -- each trip is distinct, no dedup needed
        driver_profile_id
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_driver_on_trip_created_trigger on public.trips;
create trigger notify_driver_on_trip_created_trigger
after insert on public.trips
for each row execute function public.notify_driver_on_trip_created();

-- Verify after running: allocate a vehicle/driver to another approved
-- request as Transport Manager, then check Notifications as that
-- driver's account — a "You have been assigned a trip..." entry should
-- appear, visible only to them (not to other drivers).