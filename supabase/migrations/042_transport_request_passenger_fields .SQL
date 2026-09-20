-- 042_transport_request_passenger_fields.sql
--
-- Adds the passenger-count/passenger-list/passenger-manifest fields that
-- RequestForm.jsx and requestService.js already send, but which never
-- got a matching column on transport_requests — causing:
--   "Could not find the 'passenger_count' column of 'transport_requests'
--   in the schema cache"
-- Also creates the private Storage bucket the PDF upload/signed-URL code
-- expects (passenger-manifests), since without it the next action after
-- this fix (uploading a PDF) would fail with a similar "bucket not
-- found" error.

-- ---------- 1. New columns on transport_requests ----------

alter table transport_requests
  add column if not exists passenger_count integer,
  add column if not exists passenger_list text,
  add column if not exists passenger_manifest_path text,
  add column if not exists passenger_manifest_name text;

-- Nullable is intentional: existing rows created before this migration
-- have no passenger data and shouldn't be treated as invalid. New rows
-- are still required to fill this in — that's enforced in the frontend
-- (RequestForm's validate()), not the database, matching how the rest
-- of this form's required fields are already handled.
alter table transport_requests
  add constraint transport_requests_passenger_count_check
  check (passenger_count is null or passenger_count > 0);

-- ---------- 2. Storage bucket for passenger manifest PDFs ----------

insert into storage.buckets (id, name, public)
values ('passenger-manifests', 'passenger-manifests', false)
on conflict (id) do nothing;

-- Upload: any authenticated user may upload, but only into a path
-- prefixed with their own auth.uid() — matches the path this app
-- already builds: `${userId}/${requestId}/${timestamp}-${filename}`.
create policy "Users can upload their own passenger manifests"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'passenger-manifests'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Read: the uploader can always re-open their own file, and the roles
-- that actually process requests (Admin, Transport Manager, Department
-- Head) can open any manifest, since they need to review it as part of
-- approving/allocating the request — not just whoever uploaded it.
-- current_user_role() is the SECURITY DEFINER helper added in 017.
create policy "Uploader and approving roles can read passenger manifests"
on storage.objects for select
to authenticated
using (
  bucket_id = 'passenger-manifests'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or current_user_role() in ('admin', 'transport_manager', 'department_head')
  )
);

-- Delete: only the uploader or an Admin can remove a manifest (e.g. if
-- request.jsx's delete flow is ever extended to also clean up storage).
create policy "Uploader and admin can delete passenger manifests"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'passenger-manifests'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or current_user_role() = 'admin'
  )
);