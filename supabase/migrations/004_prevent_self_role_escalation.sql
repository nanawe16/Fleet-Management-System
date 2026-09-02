-- Row-level security controls WHICH rows a policy applies to, not WHICH
-- columns can change. The existing "own profile" update policy lets any
-- user update their own row — including role and is_active — since it
-- only checks auth.uid() = id, not what changed.
--
-- This trigger closes that gap: non-admins can still update their own
-- name/phone/avatar via the UI, but any attempt to change their own
-- role or is_active is rejected at the database level, regardless of
-- what the frontend does or doesn't prevent.

create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only an admin can change a user''s role.';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'Only an admin can activate or deactivate a user.';
    end if;
  end if;

  return new;
end;
$$;

create trigger before_profile_update_check_privileges
before update on public.profiles
for each row
execute function public.prevent_self_privilege_escalation();