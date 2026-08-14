-- =========================================================================
-- 20260815090700_create_resume_tables
--
-- resume_versions · analytics_events
--
-- PRD 23.16, 23.18.
--
-- DOWN: drop table public.analytics_events, public.resume_versions;
-- =========================================================================

create table public.resume_versions (
  id              uuid primary key default gen_random_uuid(),
  storage_path    text not null unique,
  file_name       text not null,
  version_label   text,
  file_size_bytes integer,
  mime_type       text not null,
  is_published    boolean not null default false,
  notes           text,
  uploaded_at     timestamptz not null default now(),

  -- FR-RES-01: PDFs only. Enforced here as well as by the bucket config so a
  -- direct API insert cannot register a non-PDF as the published resume.
  constraint resume_versions_mime_check check (mime_type = 'application/pdf'),
  constraint resume_versions_size_check
    check (file_size_bytes is null or file_size_bytes between 1 and 10485760)
);

-- FR-RES-02 / AC-RES-2: exactly one version may be published at any time.
-- A partial unique index makes "publish this one" atomically exclusive rather
-- than a two-statement dance the application could get half-way through.
create unique index resume_versions_one_published
  on public.resume_versions ((true))
  where is_published;

comment on index public.resume_versions_one_published is
  'FR-RES-02: at most one published resume version, enforced by the database.';

-- -------------------------------------------------------------------------
-- analytics_events (23.18) — P2. The table ships now so the RLS migration can
-- cover every table in `public`; collection stays off until
-- site_settings.analytics_enabled is turned on (ANA-04).
--
-- ANA-03: no IP, no cookies, no cross-site identifiers, no full user-agent
-- string, no fingerprinting. session_hash is a random per-session value held
-- in sessionStorage and is not stable across visits.
-- -------------------------------------------------------------------------
create table public.analytics_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null,
  path          text,
  -- SET NULL, not CASCADE: historical counts survive a project deletion (24).
  project_id    uuid references public.projects (id) on delete set null,
  referrer_host text,
  session_hash  text,
  created_at    timestamptz not null default now(),

  constraint analytics_events_type_check check (
    event_type in (
      'page_view',
      'project_view',
      'resume_click',
      'github_click',
      'linkedin_click',
      'contact_submit'
    )
  ),
  constraint analytics_events_path_check check (path is null or length(path) <= 200),
  -- A host, never a full referrer URL — query strings leak.
  constraint analytics_events_referrer_check
    check (referrer_host is null or length(referrer_host) <= 120),
  constraint analytics_events_session_check
    check (session_hash is null or length(session_hash) <= 64)
);
