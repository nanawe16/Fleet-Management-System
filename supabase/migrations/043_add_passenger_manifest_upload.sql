-- Private PDF manifests for large passenger groups. File names are stored on
-- the request itself, so approval-stage reviewers can retrieve only the
-- manifests for requests they are permitted to review.

alter table public.transport_requests
  add column if not exists passenger_manifest_path text,
  add column if not exists passenger_manifest_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'passenger-manifests',
  'passenger-manifests',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf'];

create policy "Requesters upload manifests in their own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'passenger-manifests'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authorized users read request passenger manifests"
on storage.objects for select to authenticated
using (
  bucket_id = 'passenger-manifests'
  and exists (
    select 1
    from public.transport_requests request
    where request.passenger_manifest_path = storage.objects.name
      and (
        request.requested_by = auth.uid()
        or public.current_user_role() in ('admin', 'transport_manager', 'vice_president')
        or (
          public.current_user_role() = 'department_head'
          and request.department_id = public.current_user_department_id()
        )
      )
  )
);

create policy "Requesters delete manifests in their own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'passenger-manifests'
  and (storage.foldername(name))[1] = auth.uid()::text
);
