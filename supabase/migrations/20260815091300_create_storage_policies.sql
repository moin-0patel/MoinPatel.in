-- =========================================================================
-- 20260815091300_create_storage_policies
--
-- PRD 26 read/write matrix.
--
-- MED-01: uploads happen only from authenticated admin sessions. There is no
-- anonymous upload path anywhere in the product (AC-STORE-1).
--
-- DOWN: drop policy <each> on storage.objects;
-- =========================================================================

-- -------------------------------------------------------------------------
-- profile + projects — public read, admin write.
--
-- The buckets are flagged public, which serves reads through the CDN. These
-- policies govern the API path and, more importantly, the WRITE side.
-- -------------------------------------------------------------------------
create policy storage_public_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('profile', 'projects'));

create policy storage_public_images_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('profile', 'projects') and (select public.is_admin()));

create policy storage_public_images_update on storage.objects
  for update to authenticated
  using (bucket_id in ('profile', 'projects') and (select public.is_admin()))
  with check (bucket_id in ('profile', 'projects') and (select public.is_admin()));

create policy storage_public_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('profile', 'projects') and (select public.is_admin()));

-- -------------------------------------------------------------------------
-- resume — the narrow one.
--
-- FR-RES-03 / TD-08: anonymous SELECT is limited to the ONE object whose name
-- equals the currently published resume_versions.storage_path. Not "any PDF in
-- the bucket", not "any row the user knows the path of" — one object, decided
-- by the database.
--
-- Access is then exercised through a 60-second signed URL. The signed URL is
-- only issuable because this policy grants the underlying read; revoke the
-- publication flag and every previously issued URL still expires within the
-- minute (AC-RES-4).
-- -------------------------------------------------------------------------
create policy storage_resume_read_published on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'resume'
    and exists (
      select 1
      from public.resume_versions rv
      where rv.is_published
        and rv.storage_path = storage.objects.name
    )
  );

create policy storage_resume_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'resume' and (select public.is_admin()));

create policy storage_resume_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resume' and (select public.is_admin()));

create policy storage_resume_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'resume' and (select public.is_admin()))
  with check (bucket_id = 'resume' and (select public.is_admin()));

create policy storage_resume_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'resume' and (select public.is_admin()));
