-- =========================================================================
-- 20260815091200_create_storage_buckets
--
-- PRD 26. MIG-09: buckets are created by migration, not by clicking in the
-- dashboard, so `supabase db reset` reproduces them exactly.
--
-- MED-02: the bucket configuration is AUTHORITATIVE. Client-side size and MIME
-- checks exist for a good error message; these settings are the actual rule.
--
-- MED-06 / SEC-06: image/svg+xml is absent from every allow-list. An
-- unsanitised SVG served same-origin is an XSS vector, and V1 has no
-- sanitiser, so SVG upload is disabled rather than partially handled.
--
-- DOWN: delete from storage.buckets where id in ('profile','projects','resume');
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'profile',
    'profile',
    true,                                    -- avatars and the default OG image
    5242880,                                 -- 5 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'projects',
    'projects',
    true,                                    -- covers, gallery, architecture
    8388608,                                 -- 8 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'resume',
    'resume',
    false,                                   -- PRIVATE — TD-08
    10485760,                                -- 10 MB
    array['application/pdf']
  )
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Why `resume` is private (TD-08):
-- the resume carries personal contact details. A public bucket gives it a
-- stable, permanently crawlable URL that outlives any decision to take it
-- down. Private + a 60-second signed URL for the published version only means
-- the file is reachable exactly as long as someone is actually downloading it.
