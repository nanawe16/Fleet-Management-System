-- Lets admins view and edit every profile, not just their own —
-- needed for the User Management page. Existing "own profile" policies
-- from 001_create_profiles.sql are untouched; these are additional.
--
-- Uses a SECURITY DEFINER helper function rather than a raw subquery on
-- profiles inside a profiles policy — querying the same table a policy
-- protects, from within that policy, causes Postgres to report
-- "infinite recursion detected in policy for relation profiles".
-- SECURITY DEFINER makes this function run with the privileges of
-- whoever created it (bypassing RLS internally), breaking that loop.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "Admins can update all profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());