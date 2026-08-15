-- ========================================================================
-- moin-portfolio — complete database bootstrap
--
-- GENERATED FILE. Do not edit.
--   Regenerate with:  npm run db:build-apply-all
--   Sources:          supabase/migrations/*.sql  +  supabase/seed/*.sql
--
-- WHAT THIS IS FOR
--   Bringing up a brand-new Supabase project in one paste, via the dashboard
--   SQL Editor. Every migration AFTER the initial bootstrap should go through
--   `supabase db push` as PRD DEP-07 specifies — this file is not a substitute
--   for the migration workflow, only a way to start it without a CLI login.
--
-- HOW TO RUN
--   Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
-- SAFETY
--   Wrapped in a single transaction: if anything fails, nothing is applied and
--   the database is left exactly as it was. There is no half-migrated state.
--
--   The seed is idempotent (deterministic UUIDs + ON CONFLICT DO NOTHING), so
--   re-running is safe — though per DEP-08 it should only be needed once.
--
-- WHAT IS DELIBERATELY NOT HERE
--   Nothing from scripts/db/supabase-shim.sql. That file fakes the anon and
--   authenticated roles, auth.users, and the storage tables so the migrations
--   can run on bare PostgreSQL for testing. A real Supabase project already has
--   all of them, and applying the shim would clobber platform objects.
--
-- 14 migrations, 8 seed files.
-- ========================================================================

begin;


-- ========================================================================
-- Migration history bootstrap
-- ========================================================================
--
-- Records these migrations as already applied, so a later `supabase db push`
-- skips them instead of re-running all of them against a populated database.
-- Without this, the dashboard route would create exactly the schema drift that
-- MIG-06 and R-10 exist to prevent.

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version    text primary key,
  statements text[],
  name       text
);

-- Older CLI versions created this table without the later columns.
alter table supabase_migrations.schema_migrations
  add column if not exists statements text[];
alter table supabase_migrations.schema_migrations
  add column if not exists name text;

insert into supabase_migrations.schema_migrations (version, name) values
  ('20260815090000', 'enable_extensions'),
  ('20260815090100', 'create_enums'),
  ('20260815090200', 'create_core_tables'),
  ('20260815090300', 'create_project_tables'),
  ('20260815090400', 'create_taxonomy_tables'),
  ('20260815090500', 'create_cv_tables'),
  ('20260815090600', 'create_contact_tables'),
  ('20260815090700', 'create_resume_tables'),
  ('20260815090800', 'create_functions_triggers'),
  ('20260815090900', 'create_indexes'),
  ('20260815091000', 'enable_rls'),
  ('20260815091100', 'create_rls_policies'),
  ('20260815091200', 'create_storage_buckets'),
  ('20260815091300', 'create_storage_policies')
on conflict (version) do nothing;


-- ========================================================================
-- Migrations (14)
-- ========================================================================

-- ========================================================================
-- migration: 20260815090000_enable_extensions.sql
-- ========================================================================

-- =========================================================================
-- 20260815090000_enable_extensions
--
-- PRD 22.2 — no extension is enabled that is not used.
--
--   pgcrypto  gen_random_uuid() for every primary key
--   citext    case-insensitive slugs and emails, so `Moin@X.com` and
--             `moin@x.com` cannot both exist and a slug cannot be shadowed
--             by a differently-cased twin
--
-- DOWN: DROP EXTENSION citext; DROP EXTENSION pgcrypto;
-- =========================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- Private schema for values that must never be reachable through the API.
-- Holds the IP-hash salt used by hash_client_ip() (23.19). PostgREST only
-- exposes schemas listed in its config, and this one never is.
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;


-- ========================================================================
-- migration: 20260815090100_create_enums.sql
-- ========================================================================

-- =========================================================================
-- 20260815090100_create_enums
--
-- PRD 22.3. Enums are PostgreSQL ENUM types: stable, small, rarely changed.
-- Adding a value requires a migration — which is the desired friction.
--
-- Note the deliberate split across three orthogonal ideas (TD-05):
--   project_status    how finished the work is
--   publication_state whether the record is live on the site
--   visibility_mode   how much of it is exposed
-- Collapsing these into one column would make "a completed project,
-- published, but linking only to GitHub" unrepresentable.
--
-- DOWN: drop type <each> ;
-- =========================================================================

create type public.publication_state as enum ('draft', 'published', 'archived');

create type public.project_status as enum (
  'completed',
  'in_progress',
  'planned',
  'maintained',
  'archived'
);

create type public.project_category as enum (
  'ai_automation',
  'web_application',
  'business_process_automation',
  'data_reporting',
  'other'
);

create type public.visibility_mode as enum (
  'full',
  'case_study_only',
  'github_only',
  'live_demo_only',
  'private'
);

create type public.image_role as enum ('cover', 'gallery', 'screenshot', 'architecture', 'og');

create type public.tech_category as enum (
  'language',
  'framework',
  'database',
  'platform',
  'ai_service',
  'automation_tool',
  'business_tool',
  'devops',
  'other'
);

create type public.tech_role as enum ('primary', 'supporting');

create type public.experience_item_type as enum ('responsibility', 'achievement');

create type public.education_status as enum ('completed', 'in_progress', 'expected');

create type public.message_status as enum ('new', 'read', 'replied', 'archived', 'spam');

-- Mirrors project_category minus data_reporting: these are the service types a
-- visitor picks on the contact form (18.1), not the taxonomy of built work.
create type public.service_type as enum (
  'ai_automation',
  'web_application',
  'business_process_automation',
  'other'
);

create type public.admin_role as enum ('owner', 'editor');


-- ========================================================================
-- migration: 20260815090200_create_core_tables.sql
-- ========================================================================

-- =========================================================================
-- 20260815090200_create_core_tables
--
-- profiles (singleton) · site_settings (key/value) · admin_users
--
-- PRD 23.1, 23.15, 23.17.
--
-- DOWN: drop table public.admin_users, public.site_settings, public.profiles;
-- =========================================================================

-- -------------------------------------------------------------------------
-- profiles — site owner identity. Exactly one row, ever (23.1).
-- -------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text        not null,
  role_title         text        not null,
  positioning_line   text        not null,
  tagline            text,
  short_bio          text,
  long_bio_md        text,
  location           text,
  email_public       citext,
  phone_public       text,
  -- FR-CONT 18.3 / Q-10: the number is stored but hidden until Moin decides.
  phone_visible      boolean     not null default false,
  avatar_path        text,
  avatar_alt         text,
  og_image_path      text,
  available_for_work boolean     not null default true,
  published          boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- A11Y-06 / MED-03: an image without alt text cannot be stored at all.
  constraint profiles_avatar_alt_check
    check (avatar_path is null or nullif(btrim(avatar_alt), '') is not null),

  constraint profiles_email_check
    check (email_public is null or email_public ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

comment on table public.profiles is
  'Site owner identity. Singleton — enforced by profiles_singleton below.';

-- The singleton guarantee. A partial unique index on a constant expression
-- permits exactly one row and costs nothing to maintain.
create unique index profiles_singleton on public.profiles ((true));

-- -------------------------------------------------------------------------
-- site_settings — heterogeneous, optional, expected to grow (23.15).
--
-- A key/value table rather than a wide singleton row: these values have
-- nothing in common but their audience, and adding one should not require a
-- schema change. Each key is documented in docs/settings.md and typed in
-- src/types/settings.ts.
-- -------------------------------------------------------------------------
create table public.site_settings (
  key         text primary key,
  value       jsonb       not null,
  description text,
  -- Drives the anon read allow-list in the RLS policy (25.1). Any future
  -- operational or private setting is invisible by default because this
  -- column defaults to false — the safe direction.
  is_public   boolean     not null default false,
  updated_at  timestamptz not null default now(),

  constraint site_settings_key_check check (key ~ '^[a-z][a-z0-9_]{1,60}$')
);

comment on column public.site_settings.is_public is
  'When true, the key is readable by anon. Defaults to false so new settings are private until deliberately exposed (PRD 25.1).';

-- -------------------------------------------------------------------------
-- admin_users — the authorisation source of truth (23.17, TD-04).
--
-- Deliberately NOT user_metadata: that is writable by the user through the
-- auth API and must never carry authorisation. This table is inspectable in
-- SQL and testable with pgTAP.
--
-- Seeded only in local/staging. The production row is created once, manually
-- and documentedly, after the owner account exists (28.1, DEP sequence).
-- -------------------------------------------------------------------------
create table public.admin_users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        citext           not null,
  display_name text,
  role         public.admin_role not null default 'owner',
  created_at   timestamptz      not null default now()
);

comment on table public.admin_users is
  'Membership here IS admin authority (TD-04). No client-side write path exists.';


-- ========================================================================
-- migration: 20260815090300_create_project_tables.sql
-- ========================================================================

-- =========================================================================
-- 20260815090300_create_project_tables
--
-- projects · project_images · project_pipeline_steps
--
-- PRD 23.2, 23.3, 23.4.
--
-- DOWN: drop table public.project_pipeline_steps, public.project_images,
--       public.projects;
-- =========================================================================

create table public.projects (
  id                   uuid primary key default gen_random_uuid(),
  slug                 citext not null unique,
  title                text   not null,
  subtitle             text,
  summary              text   not null,

  -- Case-study body. The _md suffix makes the rendering requirement obvious
  -- at a glance (22.2) — every one of these goes through the sanitising
  -- renderer, never through dangerouslySetInnerHTML (FR-CASE-02, SEC-05).
  description_md       text,
  problem_md           text,
  solution_md          text,
  how_it_works_md      text,
  architecture_md      text,
  business_impact_md   text,
  challenges_md        text,
  lessons_md           text,
  role_description     text,

  -- Three orthogonal axes (TD-05).
  status               public.project_status    not null default 'in_progress',
  category             public.project_category  not null,
  publication_state    public.publication_state not null default 'draft',
  visibility_mode      public.visibility_mode   not null default 'case_study_only',

  is_featured          boolean not null default false,
  sort_order           integer not null default 0,

  started_on           date,
  completed_on         date,

  cover_image_path     text,
  cover_image_alt      text,

  github_url           text,
  live_url             text,
  video_url            text,

  -- FR-PROJ-16 confidentiality control. Defaults are the safe ones: a client
  -- is undisclosed until someone deliberately says otherwise.
  client_name          text,
  client_disclosed     boolean not null default false,
  confidentiality_note text,

  seo_title            text,
  seo_description      text,
  og_image_path        text,

  view_count           integer not null default 0,
  published_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- --- Shape constraints (23.2) -----------------------------------------
  -- The ::text cast is load-bearing. `slug` is citext, and citext's ~ operator
  -- is CASE-INSENSITIVE — so `slug ~ '^[a-z0-9...]'` happily accepts
  -- 'Not-A-Slug', and the uppercase would then appear in canonical URLs, the
  -- sitemap and every shared link. Casting to text restores case sensitivity
  -- while keeping citext's case-insensitive UNIQUE, which is what we actually
  -- want from the type.
  constraint projects_slug_check
    check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 80),
  constraint projects_title_check   check (length(title) between 1 and 120),
  constraint projects_summary_check check (length(summary) between 1 and 200),
  constraint projects_seo_title_check
    check (seo_title is null or length(seo_title) <= 60),
  constraint projects_seo_description_check
    check (seo_description is null or length(seo_description) <= 160),

  constraint projects_dates_check
    check (completed_on is null or started_on is null or completed_on >= started_on),

  -- CHECK, not just client validation: the API is publicly reachable (SEC-04).
  constraint projects_github_url_check check (github_url is null or github_url like 'https://%'),
  constraint projects_live_url_check   check (live_url   is null or live_url   like 'https://%'),
  constraint projects_video_url_check  check (video_url  is null or video_url  like 'https://%'),

  -- A11Y-06 / MED-03: alt text is not optional.
  constraint projects_cover_alt_check
    check (cover_image_path is null or nullif(btrim(cover_image_alt), '') is not null),

  -- 13.2: these visibility modes make the card link directly to an external
  -- destination. Without the URL the card would link nowhere.
  constraint projects_github_only_requires_url
    check (visibility_mode <> 'github_only' or github_url is not null),
  constraint projects_live_demo_only_requires_url
    check (visibility_mode <> 'live_demo_only' or live_url is not null),

  -- FR-ADM-11 publish gate, the part expressible in SQL. The form enforces the
  -- rest (alt text on every attached image); this catches a direct API call.
  constraint projects_publish_gate
    check (
      publication_state <> 'published'
      or (
        nullif(btrim(summary), '') is not null
        and coalesce(
          nullif(btrim(description_md), ''),
          nullif(btrim(problem_md), ''),
          nullif(btrim(solution_md), ''),
          nullif(btrim(how_it_works_md), ''),
          nullif(btrim(business_impact_md), '')
        ) is not null
      )
    )
);

comment on constraint projects_publish_gate on public.projects is
  'FR-ADM-11: a project cannot be published as an empty shell. At least one case-study field must be populated.';

comment on column public.projects.confidentiality_note is
  'Admin-only. Never selected by any public query (API-01 forbids select *).';

comment on column public.projects.view_count is
  'Mutated only through increment_project_view() (P2). anon has no UPDATE grant.';

-- -------------------------------------------------------------------------
-- project_images (23.3)
-- -------------------------------------------------------------------------
create table public.project_images (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  storage_path    text not null,
  -- NOT NULL by design: accessibility is not optional (A11Y-06, MED-03).
  alt_text        text not null,
  caption         text,
  role            public.image_role not null default 'gallery',
  -- Captured at upload so the frontend can reserve space (MED-05, PERF-03).
  width           integer,
  height          integer,
  file_size_bytes integer,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  constraint project_images_alt_text_check check (nullif(btrim(alt_text), '') is not null),
  constraint project_images_width_check    check (width  is null or width  > 0),
  constraint project_images_height_check   check (height is null or height > 0),
  constraint project_images_size_check     check (file_size_bytes is null or file_size_bytes > 0)
);

-- -------------------------------------------------------------------------
-- project_pipeline_steps (23.4, TD-10)
--
-- Workflows such as the Capiche feedback pipeline are data, not prose. Storing
-- them structurally is what makes FR-CASE-04 possible: the pipeline renders as
-- an ordered visual, is reorderable in admin, and can be reused in the
-- architecture image's caption.
-- -------------------------------------------------------------------------
create table public.project_pipeline_steps (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid    not null references public.projects (id) on delete cascade,
  step_number integer not null,
  label       text    not null,
  description text,
  tech_note   text,
  icon_key    text,

  constraint project_pipeline_steps_unique_step unique (project_id, step_number),
  constraint project_pipeline_steps_step_check  check (step_number > 0),
  constraint project_pipeline_steps_label_check check (nullif(btrim(label), '') is not null)
);

comment on column public.project_pipeline_steps.icon_key is
  'Maps to a local icon registry. No remote icon fetching (23.5 convention).';


-- ========================================================================
-- migration: 20260815090400_create_taxonomy_tables.sql
-- ========================================================================

-- =========================================================================
-- 20260815090400_create_taxonomy_tables
--
-- technologies · project_technologies
--
-- PRD 23.5, 23.6.
--
-- DOWN: drop table public.project_technologies, public.technologies;
-- =========================================================================

create table public.technologies (
  id          uuid primary key default gen_random_uuid(),
  name        citext not null unique,
  slug        citext not null unique,
  category    public.tech_category not null,
  icon_key    text,
  color_hex   text,
  website_url text,
  sort_order  integer not null default 0,
  published   boolean not null default true,

  -- ::text because citext's ~ is case-insensitive and would accept uppercase.
  -- See the note on projects_slug_check.
  constraint technologies_slug_check
    check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 1 and 60),
  constraint technologies_color_check
    check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  constraint technologies_website_check
    check (website_url is null or website_url like 'https://%')
);

comment on column public.technologies.icon_key is
  'Maps to a local icon registry. No remote icon fetching — that would be a third-party request on every card render (PERF-08 spirit).';

-- -------------------------------------------------------------------------
-- project_technologies (23.6)
--
-- ON DELETE RESTRICT on the technology side is deliberate: it prevents
-- silently orphaning a technology that is still in use. The admin UI explains
-- which projects block the delete rather than cascading the link away.
-- -------------------------------------------------------------------------
create table public.project_technologies (
  project_id    uuid not null references public.projects (id)     on delete cascade,
  technology_id uuid not null references public.technologies (id) on delete restrict,
  tech_role     public.tech_role not null default 'primary',
  sort_order    integer not null default 0,

  primary key (project_id, technology_id)
);


-- ========================================================================
-- migration: 20260815090500_create_cv_tables.sql
-- ========================================================================

-- =========================================================================
-- 20260815090500_create_cv_tables
--
-- experience · experience_items · experience_technologies
-- skill_categories · skills · education
--
-- PRD 23.7 – 23.12.
--
-- DOWN: drop table public.education, public.skills, public.skill_categories,
--       public.experience_technologies, public.experience_items,
--       public.experience;
-- =========================================================================

-- -------------------------------------------------------------------------
-- experience (23.7)
-- -------------------------------------------------------------------------
create table public.experience (
  id                uuid primary key default gen_random_uuid(),
  company           text not null,
  company_url       text,
  -- FR-EXP-06: concurrent titles within one company live in this single field,
  -- separated by ' · '. Duplicating the company row per title would render as
  -- three employers, which would be a lie about the CV.
  role_title        text not null,
  employment_type   text,
  location          text,
  start_date        date not null,
  end_date          date,
  is_current        boolean not null default false,
  summary_md        text,
  publication_state public.publication_state not null default 'draft',
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint experience_dates_check
    check (end_date is null or end_date >= start_date),
  -- AC-EXP-3: a current role renders "Present" and therefore cannot also
  -- carry an end date. The database refuses the contradiction.
  constraint experience_current_check
    check (is_current = false or end_date is null),
  constraint experience_company_url_check
    check (company_url is null or company_url like 'https://%')
);

-- -------------------------------------------------------------------------
-- experience_items (23.8)
--
-- Responsibilities and achievements are the same shape but must render as two
-- separately labelled, independently reorderable lists (FR-EXP-03).
-- -------------------------------------------------------------------------
create table public.experience_items (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experience (id) on delete cascade,
  item_type     public.experience_item_type not null,
  content       text not null,
  sort_order    integer not null default 0,

  constraint experience_items_content_check check (nullif(btrim(content), '') is not null)
);

-- -------------------------------------------------------------------------
-- experience_technologies (23.9)
-- -------------------------------------------------------------------------
create table public.experience_technologies (
  experience_id uuid not null references public.experience (id)   on delete cascade,
  technology_id uuid not null references public.technologies (id) on delete restrict,
  sort_order    integer not null default 0,

  primary key (experience_id, technology_id)
);

-- -------------------------------------------------------------------------
-- skill_categories (23.10)
-- -------------------------------------------------------------------------
create table public.skill_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text   not null unique,
  slug        citext not null unique,
  description text,
  icon_key    text,
  sort_order  integer not null default 0,
  published   boolean not null default true,

  -- ::text because citext's ~ is case-insensitive (see projects_slug_check).
  constraint skill_categories_slug_check
    check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 1 and 60)
);

-- -------------------------------------------------------------------------
-- skills (23.11)
--
-- There is NO proficiency column. FR-SKILL-03 forbids percentages, bars and
-- star ratings; `is_core` and ordering are the only emphasis mechanisms. This
-- absence is a product decision, not an oversight — do not add one without
-- reopening it (AC-SKILL-3 asserts the column does not exist).
-- -------------------------------------------------------------------------
create table public.skills (
  id          uuid primary key default gen_random_uuid(),
  -- RESTRICT: deleting a category must not silently take its skills with it.
  -- The admin requires reassignment first (24 cascade policy).
  category_id uuid   not null references public.skill_categories (id) on delete restrict,
  name        text   not null,
  slug        citext not null,
  description text,
  is_core     boolean not null default false,
  sort_order  integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),

  constraint skills_unique_in_category unique (category_id, name),
  -- ::text because citext's ~ is case-insensitive (see projects_slug_check).
  constraint skills_slug_check
    check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 1 and 60)
);

-- -------------------------------------------------------------------------
-- education (23.12)
-- -------------------------------------------------------------------------
create table public.education (
  id                uuid primary key default gen_random_uuid(),
  institution       text not null,
  qualification     text not null,
  field_of_study    text,
  location          text,
  start_date        date,
  end_date          date,
  status            public.education_status not null,
  grade_label       text,
  -- FR-EDU-04: a grade renders only when populated AND explicitly shown.
  -- Default false because school percentages usually add nothing to a
  -- portfolio aimed at business clients (Q-18).
  show_grade        boolean not null default false,
  description       text,
  publication_state public.publication_state not null default 'draft',
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint education_dates_check check (end_date is null or start_date is null or end_date >= start_date)
);


-- ========================================================================
-- migration: 20260815090600_create_contact_tables.sql
-- ========================================================================

-- =========================================================================
-- 20260815090600_create_contact_tables
--
-- contact_messages · social_links
--
-- PRD 23.13, 23.14.
--
-- The CHECK constraints on contact_messages mirror the Zod schema in
-- src/types/forms.ts exactly. That duplication is intentional (SEC-04): the
-- Supabase endpoint is publicly reachable with the publishable key, so client
-- validation is a courtesy and these constraints are the actual rule.
--
-- DOWN: drop table public.social_links, public.contact_messages;
-- =========================================================================

create table public.contact_messages (
  id                uuid primary key default gen_random_uuid(),
  name              text   not null,
  email             citext not null,
  company           text,
  subject           text   not null,
  message           text   not null,
  service_type      public.service_type   not null default 'other',
  status            public.message_status not null default 'new',
  source_page       text,

  -- 23.14: SHA-256 of client IP + a server-side salt, written by trigger.
  -- The raw IP is never stored anywhere in this product.
  ip_hash           text,
  -- Coarse family only ("Chrome"), never the full UA string — a full UA is a
  -- fingerprinting surface for no operational benefit.
  user_agent_family text,

  admin_notes       text,
  created_at        timestamptz not null default now(),
  read_at           timestamptz,
  replied_at        timestamptz,

  constraint contact_messages_name_check    check (length(btrim(name))    between 2 and 80),
  constraint contact_messages_subject_check check (length(btrim(subject)) between 3 and 150),
  constraint contact_messages_message_check check (length(btrim(message)) between 20 and 4000),
  constraint contact_messages_company_check check (company is null or length(company) <= 120),
  constraint contact_messages_email_check
    check (length(email) <= 160 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint contact_messages_source_page_check
    check (source_page is null or length(source_page) <= 200)
);

comment on table public.contact_messages is
  'A triage inbox, not a CRM (NG-02). anon may INSERT and nothing else — there is no SELECT policy at all (25.1).';

-- -------------------------------------------------------------------------
-- social_links (23.13)
--
-- Database-driven rather than hard-coded so Moin can add a profile without a
-- commit (Principle 5: content is data, not code).
-- -------------------------------------------------------------------------
create table public.social_links (
  id             uuid primary key default gen_random_uuid(),
  platform       text not null,
  label          text not null,
  url            text not null,
  icon_key       text not null,
  show_in_hero   boolean not null default true,
  show_in_footer boolean not null default true,
  sort_order     integer not null default 0,
  published      boolean not null default true,

  constraint social_links_url_check
    check (url like 'https://%' or url like 'mailto:%')
);


-- ========================================================================
-- migration: 20260815090700_create_resume_tables.sql
-- ========================================================================

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


-- ========================================================================
-- migration: 20260815090800_create_functions_triggers.sql
-- ========================================================================

-- =========================================================================
-- 20260815090800_create_functions_triggers
--
-- PRD 23.19.
--
-- Every function here pins `search_path`. An unpinned search_path on a
-- SECURITY DEFINER function is a privilege-escalation vector: a caller who
-- can create objects in a schema earlier on the path can shadow a referenced
-- table and have it executed as the definer.
--
-- DOWN: drop each trigger, then each function, then private.app_secrets.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Schema addition, documented as a deviation from 23.14
--
-- FR-CONT-08 requires the 3-second minimum time-to-submit to be "measured
-- client-side and re-checked by a database trigger". A trigger cannot re-check
-- something it has no record of, so the client must submit when the form was
-- rendered. This column carries that value; the trigger compares it to now()
-- and then blanks it, so it is never retained as per-visitor telemetry.
--
-- Without this column the timing half of FR-CONT-08 would be client-only —
-- i.e. decorative, exactly what TD-11 rejects for the rate limit.
-- -------------------------------------------------------------------------
alter table public.contact_messages
  add column form_rendered_at timestamptz;

comment on column public.contact_messages.form_rendered_at is
  'Client-supplied form render time, used once by enforce_contact_rate_limit() for the FR-CONT-08 timing check, then nulled. Never retained.';

-- -------------------------------------------------------------------------
-- Private secrets — unreachable through the API (see 20260815090000).
-- -------------------------------------------------------------------------
create table private.app_secrets (
  key   text primary key,
  value text not null
);

-- A per-environment random salt. Because it is generated here rather than
-- committed, the same IP produces different hashes in local, staging and
-- production, and the seed file carries no secret (28.1).
insert into private.app_secrets (key, value)
values ('ip_hash_salt', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- -------------------------------------------------------------------------
-- set_updated_at() — shared by every table carrying the column (22.2)
-- -------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger experience_set_updated_at
  before update on public.experience
  for each row execute function public.set_updated_at();

create trigger education_set_updated_at
  before update on public.education
  for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- set_published_at() — 23.19
--
-- Sets projects.published_at on the FIRST transition to published, and never
-- clears it. Unpublishing and republishing must not rewrite history: the
-- original publication date is what "published_at desc" ordering means.
-- -------------------------------------------------------------------------
create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publication_state = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger projects_set_published_at
  before insert or update of publication_state on public.projects
  for each row execute function public.set_published_at();

-- -------------------------------------------------------------------------
-- is_admin() — the authorisation predicate used by every admin policy (TD-04)
--
-- SECURITY DEFINER specifically to avoid recursive RLS evaluation: the
-- admin_users policies would otherwise need to consult admin_users to decide
-- whether admin_users may be read.
--
-- STABLE so the planner evaluates it once per statement rather than per row.
-- -------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

comment on function public.is_admin() is
  'TD-04: admin identity is membership in admin_users — never a user-writable JWT claim.';

-- -------------------------------------------------------------------------
-- hash_client_ip() — 23.19
--
-- Writes ip_hash = SHA-256(client IP || per-environment salt). The raw IP is
-- never stored. The hash exists only so enforce_contact_rate_limit() can count
-- submissions per origin; it is not a visitor identifier.
--
-- Also forces the columns a client must not control (FR-CONT / 25.1 notes).
-- -------------------------------------------------------------------------
create or replace function public.hash_client_ip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salt    text;
  v_headers json;
  v_ip      text;
begin
  select value into v_salt from private.app_secrets where key = 'ip_hash_salt';

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;

  -- x-forwarded-for may be a chain; the client is the first entry.
  v_ip := coalesce(
    split_part(v_headers ->> 'x-forwarded-for', ',', 1),
    v_headers ->> 'cf-connecting-ip',
    'unknown'
  );

  new.ip_hash := encode(extensions.digest(btrim(v_ip) || coalesce(v_salt, ''), 'sha256'), 'hex');

  -- Server-owned columns. A crafted insert cannot pre-set these.
  new.status      := 'new';
  new.admin_notes := null;
  new.read_at     := null;
  new.replied_at  := null;
  new.created_at  := now();

  -- Coarse family only, derived server-side (23.14).
  new.user_agent_family := case
    when v_headers ->> 'user-agent' ilike '%edg/%'     then 'Edge'
    when v_headers ->> 'user-agent' ilike '%chrome/%'  then 'Chrome'
    when v_headers ->> 'user-agent' ilike '%firefox/%' then 'Firefox'
    when v_headers ->> 'user-agent' ilike '%safari/%'  then 'Safari'
    when v_headers ->> 'user-agent' is null            then null
    else 'Other'
  end;

  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- enforce_contact_rate_limit() — FR-CONT-08 / TD-11
--
-- Enforced in the database, not the client, because the endpoint is publicly
-- reachable with the publishable key. A client-side throttle is decorative.
--
-- SECURITY DEFINER so the counting SELECT sees all rows: anon has no SELECT
-- policy on contact_messages (25.1) and would otherwise count zero.
--
-- The raised SQLSTATEs are mapped to user-facing copy by the service layer
-- (PRD 38, "Rate limit hit").
-- -------------------------------------------------------------------------
create or replace function public.enforce_contact_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hour_count integer;
  v_day_count  integer;
begin
  -- Timing check. A human cannot read, fill and submit this form in 3 seconds;
  -- a bot posting straight to the API can. A missing value is treated as a
  -- failure, so omitting the field is not a way around the check.
  if new.form_rendered_at is null
     or new.created_at - new.form_rendered_at < interval '3 seconds' then
    raise exception 'Submission rejected: too fast'
      using errcode = 'P0001', hint = 'contact_too_fast';
  end if;

  -- A clock-skewed or forged future timestamp must not buy an exemption.
  if new.form_rendered_at > new.created_at + interval '5 minutes' then
    raise exception 'Submission rejected: invalid timing'
      using errcode = 'P0001', hint = 'contact_too_fast';
  end if;

  select count(*) into v_hour_count
  from public.contact_messages m
  where m.ip_hash = new.ip_hash
    and m.created_at > now() - interval '1 hour';

  if v_hour_count >= 5 then
    raise exception 'Submission rejected: hourly rate limit reached'
      using errcode = 'P0001', hint = 'contact_rate_limited';
  end if;

  select count(*) into v_day_count
  from public.contact_messages m
  where m.ip_hash = new.ip_hash
    and m.created_at > now() - interval '1 day';

  if v_day_count >= 20 then
    raise exception 'Submission rejected: daily rate limit reached'
      using errcode = 'P0001', hint = 'contact_rate_limited';
  end if;

  -- Consumed. Not retained as per-visitor telemetry.
  new.form_rendered_at := null;

  return new;
end;
$$;

-- Order matters: hash_client_ip must run first so the rate limiter has an
-- ip_hash to count against, and so created_at is server-set before the
-- timing comparison. Trigger execution order within a timing is alphabetical
-- by name, hence the numeric prefixes.
create trigger contact_messages_10_hash_client_ip
  before insert on public.contact_messages
  for each row execute function public.hash_client_ip();

create trigger contact_messages_20_rate_limit
  before insert on public.contact_messages
  for each row execute function public.enforce_contact_rate_limit();

-- -------------------------------------------------------------------------
-- increment_project_view(slug) — P2, 23.19
--
-- The only permitted mutation path for view_count. anon holds no UPDATE grant
-- on projects, so this RPC is the whole surface, and it only ever touches
-- published, non-private rows.
-- -------------------------------------------------------------------------
create or replace function public.increment_project_view(p_slug citext)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects
  set view_count = view_count + 1
  where slug = p_slug
    and publication_state = 'published'
    and visibility_mode <> 'private';
end;
$$;

revoke all on function public.increment_project_view(citext) from public;
grant execute on function public.increment_project_view(citext) to anon, authenticated;


-- ========================================================================
-- migration: 20260815090900_create_indexes.sql
-- ========================================================================

-- =========================================================================
-- 20260815090900_create_indexes
--
-- PRD 23.2 – 23.14 index lists.
--
-- Every index below backs a query that actually exists in the service layer.
-- An index with no query is write cost for nothing.
--
-- DOWN: drop index <each>;
-- =========================================================================

-- --- projects ------------------------------------------------------------
-- The public list query: publication + visibility predicate, then the
-- FR-PROJ-01 ordering (is_featured desc, sort_order asc, published_at desc).
create index idx_projects_public
  on public.projects (publication_state, visibility_mode, is_featured, sort_order);

create index idx_projects_category
  on public.projects (category);

create index idx_projects_published_at
  on public.projects (published_at desc);

-- --- project children ----------------------------------------------------
-- Both are always read as "everything for this project, in order".
create index idx_project_images_project
  on public.project_images (project_id, sort_order);

create index idx_project_pipeline_steps_project
  on public.project_pipeline_steps (project_id, step_number);

-- Composite PK already covers (project_id, technology_id); this covers the
-- reverse direction, used by the FR-PROJ-05 technology filter.
create index idx_project_tech_tech
  on public.project_technologies (technology_id);

-- --- experience ----------------------------------------------------------
create index idx_experience_public
  on public.experience (publication_state, sort_order, start_date desc);

create index idx_experience_items
  on public.experience_items (experience_id, item_type, sort_order);

create index idx_experience_tech_tech
  on public.experience_technologies (technology_id);

-- --- skills / education / social ----------------------------------------
create index idx_skills_public
  on public.skills (published, category_id, sort_order);

create index idx_skill_categories_public
  on public.skill_categories (published, sort_order);

create index idx_education_public
  on public.education (publication_state, sort_order, start_date desc);

create index idx_social_links_public
  on public.social_links (published, sort_order);

-- --- contact -------------------------------------------------------------
-- Admin inbox: filter by status, newest first (FR-ADM-03).
create index idx_messages_status
  on public.contact_messages (status, created_at desc);

-- The rate-limit window scan in enforce_contact_rate_limit(). Without this,
-- every submission table-scans the inbox.
create index idx_messages_ip_window
  on public.contact_messages (ip_hash, created_at desc);

-- --- analytics (P2) ------------------------------------------------------
create index idx_analytics_events_type
  on public.analytics_events (event_type, created_at desc);


-- ========================================================================
-- migration: 20260815091000_enable_rls.sql
-- ========================================================================

-- =========================================================================
-- 20260815091000_enable_rls
--
-- PRD 25 global rules 1 and "Defence in depth".
--
-- Two independent mechanisms guard every table:
--
--   1. RLS policies (next migration) decide which ROWS are visible.
--   2. Table grants decide which OPERATIONS are reachable at all.
--
-- Both must fail open for a leak to occur. Revoking write grants from anon
-- means that even a policy mistake in a later migration cannot expose a write
-- path on a content table — PostgREST rejects it before RLS is consulted.
--
-- RLS is enabled on EVERY table in `public`, including ones with no anonymous
-- access. A table with RLS off and no policies is fully readable; a table with
-- RLS on and no policies is fully closed. On is the safe default.
--
-- DOWN: alter table ... disable row level security; re-grant.
-- =========================================================================

alter table public.profiles                enable row level security;
alter table public.site_settings           enable row level security;
alter table public.admin_users             enable row level security;
alter table public.projects                enable row level security;
alter table public.project_images          enable row level security;
alter table public.project_pipeline_steps  enable row level security;
alter table public.technologies            enable row level security;
alter table public.project_technologies    enable row level security;
alter table public.experience              enable row level security;
alter table public.experience_items        enable row level security;
alter table public.experience_technologies enable row level security;
alter table public.skill_categories        enable row level security;
alter table public.skills                  enable row level security;
alter table public.education               enable row level security;
alter table public.social_links            enable row level security;
alter table public.contact_messages        enable row level security;
alter table public.resume_versions         enable row level security;
alter table public.analytics_events        enable row level security;

-- Force RLS for table owners too, so a definer-context mistake cannot bypass
-- the policies on the two tables holding non-public data.
alter table public.contact_messages force row level security;
alter table public.admin_users      force row level security;

-- -------------------------------------------------------------------------
-- Grants — start from nothing.
-- -------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

-- Read is granted broadly; the policies decide which rows come back. A table
-- with no SELECT policy (contact_messages, admin_users) still returns zero
-- rows to anon — zero rows, not an error, which is what AC-RLS-4 requires.
grant select on all tables in schema public to anon, authenticated;

-- The ONLY anon write paths in the entire product (25.1 "Defence in depth").
grant insert on public.contact_messages to anon, authenticated;
grant insert on public.analytics_events to anon, authenticated;

-- Admin writes arrive as the `authenticated` role and are authorised row-by-row
-- by is_admin() in the policies. The grant is necessary but not sufficient.
grant insert, update, delete on
  public.profiles,
  public.site_settings,
  public.projects,
  public.project_images,
  public.project_pipeline_steps,
  public.technologies,
  public.project_technologies,
  public.experience,
  public.experience_items,
  public.experience_technologies,
  public.skill_categories,
  public.skills,
  public.education,
  public.social_links,
  public.resume_versions
to authenticated;

-- Message triage: status/notes only. There is no INSERT for admins — messages
-- come from the public form, and no DELETE-by-anon anywhere.
grant update, delete on public.contact_messages to authenticated;

-- admin_users has NO client-side write path. Membership is granted through a
-- migration or a documented SQL statement, never through the API (25.1).
revoke insert, update, delete on public.admin_users from anon, authenticated;

-- Future tables inherit the safe posture rather than depending on someone
-- remembering to revoke.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;


-- ========================================================================
-- migration: 20260815091100_create_rls_policies.sql
-- ========================================================================

-- =========================================================================
-- 20260815091100_create_rls_policies
--
-- PRD 25. The policy matrix in 25.1, expressed.
--
-- Global rules applied throughout:
--   3. Policies are written per operation. Never a blanket FOR ALL USING(true).
--   4. Admin policies use is_admin() in BOTH `using` and `with check`, so an
--      admin can neither read a row they may not write nor write a row into a
--      state they may not read.
--   5. Public read policies filter on publication state INSIDE the policy, so
--      a forgotten client-side filter cannot leak drafts.
--
-- `(select auth.uid())` and `(select public.is_admin())` are wrapped in
-- scalar subqueries deliberately: that lets the planner evaluate them once
-- per statement instead of once per row.
--
-- DOWN: drop policy <each> on <table>;
-- =========================================================================

-- =========================================================================
-- profiles — anon reads the single published row
-- =========================================================================
create policy profiles_select_public on public.profiles
  for select to anon, authenticated
  using (published);

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =========================================================================
-- projects — the predicate that defines "public" for this entire product
-- =========================================================================
create policy projects_select_public on public.projects
  for select to anon, authenticated
  using (publication_state = 'published' and visibility_mode <> 'private');

create policy projects_admin_all on public.projects
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =========================================================================
-- Project children — visibility is inherited from the parent.
--
-- Each repeats the parent predicate rather than trusting a join in the
-- application. A draft project's images must be unreachable even by someone
-- querying project_images directly with a known project_id.
-- =========================================================================
create policy project_images_select_public on public.project_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_images.project_id
        and p.publication_state = 'published'
        and p.visibility_mode <> 'private'
    )
  );

create policy project_images_admin_all on public.project_images
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy project_pipeline_steps_select_public on public.project_pipeline_steps
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_pipeline_steps.project_id
        and p.publication_state = 'published'
        and p.visibility_mode <> 'private'
    )
  );

create policy project_pipeline_steps_admin_all on public.project_pipeline_steps
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy project_technologies_select_public on public.project_technologies
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_technologies.project_id
        and p.publication_state = 'published'
        and p.visibility_mode <> 'private'
    )
  );

create policy project_technologies_admin_all on public.project_technologies
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =========================================================================
-- technologies
-- =========================================================================
create policy technologies_select_public on public.technologies
  for select to anon, authenticated
  using (published);

create policy technologies_admin_all on public.technologies
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =========================================================================
-- experience and children
-- =========================================================================
create policy experience_select_public on public.experience
  for select to anon, authenticated
  using (publication_state = 'published');

create policy experience_admin_all on public.experience
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy experience_items_select_public on public.experience_items
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.experience e
      where e.id = experience_items.experience_id
        and e.publication_state = 'published'
    )
  );

create policy experience_items_admin_all on public.experience_items
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy experience_technologies_select_public on public.experience_technologies
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.experience e
      where e.id = experience_technologies.experience_id
        and e.publication_state = 'published'
    )
  );

create policy experience_technologies_admin_all on public.experience_technologies
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =========================================================================
-- skills — a skill is public only if its category is too (FR-SKILL-05)
-- =========================================================================
create policy skill_categories_select_public on public.skill_categories
  for select to anon, authenticated
  using (published);

create policy skill_categories_admin_all on public.skill_categories
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy skills_select_public on public.skills
  for select to anon, authenticated
  using (
    published
    and exists (
      select 1 from public.skill_categories c
      where c.id = skills.category_id and c.published
    )
  );

create policy skills_admin_all on public.skills
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =========================================================================
-- education
-- =========================================================================
create policy education_select_public on public.education
  for select to anon, authenticated
  using (publication_state = 'published');

create policy education_admin_all on public.education
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =========================================================================
-- social_links
-- =========================================================================
create policy social_links_select_public on public.social_links
  for select to anon, authenticated
  using (published);

create policy social_links_admin_all on public.social_links
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =========================================================================
-- contact_messages — INSERT-only for the public.
--
-- There is deliberately NO select policy for anon. That yields zero rows
-- rather than an error (AC-RLS-4, AC-CONT-8).
--
-- The `with check` pins the columns a submitter must not control. The
-- server-owned ones (status, ip_hash, timestamps, notes) are additionally
-- overwritten by the hash_client_ip() trigger, so a crafted payload loses
-- twice. Length limits live in the CHECK constraints (23.14).
--
-- INSERT ... RETURNING is avoided in the service: with no SELECT policy the
-- return would fail anyway, and the client has no reason to read the row back.
-- =========================================================================
create policy contact_messages_insert_public on public.contact_messages
  for insert to anon, authenticated
  with check (
    status = 'new'
    and admin_notes is null
    and read_at is null
    and replied_at is null
    and ip_hash is null
    and user_agent_family is null
  );

create policy contact_messages_admin_select on public.contact_messages
  for select to authenticated
  using ((select public.is_admin()));

create policy contact_messages_admin_update on public.contact_messages
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy contact_messages_admin_delete on public.contact_messages
  for delete to authenticated
  using ((select public.is_admin()));

-- =========================================================================
-- site_settings — anon reads an ALLOW-LIST, not "everything not marked secret"
--
-- is_public defaults to false (23.15), so a setting added later is invisible
-- until someone deliberately exposes it. That is the safe direction of
-- failure: forgetting the flag hides a value rather than leaking one.
-- =========================================================================
create policy site_settings_select_public on public.site_settings
  for select to anon, authenticated
  using (is_public);

create policy site_settings_admin_all on public.site_settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =========================================================================
-- resume_versions — only the published row's metadata is readable.
--
-- Combined with the storage policy in the next migration, this yields exactly
-- one downloadable resume and no way to enumerate the others (FR-RES-03).
-- =========================================================================
create policy resume_versions_select_public on public.resume_versions
  for select to anon, authenticated
  using (is_published);

create policy resume_versions_admin_all on public.resume_versions
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =========================================================================
-- admin_users — no anon access; a signed-in user reads only their own row,
-- which is exactly what <ProtectedRoute> needs and nothing more.
--
-- No write policy exists at all. Combined with the revoked grants, there is
-- no path from the API to admin membership (AC-RLS-6).
-- =========================================================================
create policy admin_users_select_self on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()));

-- =========================================================================
-- analytics_events (P2) — insert-only, and only the shapes ANA-03 permits.
-- =========================================================================
create policy analytics_events_insert_public on public.analytics_events
  for insert to anon, authenticated
  with check (
    event_type in (
      'page_view', 'project_view', 'resume_click',
      'github_click', 'linkedin_click', 'contact_submit'
    )
  );

create policy analytics_events_admin_select on public.analytics_events
  for select to authenticated
  using ((select public.is_admin()));

-- =========================================================================
-- v_public_projects (23.20, P1)
--
-- Aggregates technologies as JSON so the index and home queries do not N+1
-- (API-03). security_invoker = on is REQUIRED: without it the view would run
-- as its owner and silently bypass the RLS of its underlying tables — turning
-- a performance helper into a data leak.
-- =========================================================================
create view public.v_public_projects
with (security_invoker = on) as
select
  p.id,
  p.slug,
  p.title,
  p.subtitle,
  p.summary,
  p.status,
  p.category,
  p.visibility_mode,
  p.is_featured,
  p.sort_order,
  p.started_on,
  p.completed_on,
  p.cover_image_path,
  p.cover_image_alt,
  p.github_url,
  p.live_url,
  p.published_at,
  p.updated_at,
  coalesce(
    (
      select jsonb_agg(
               jsonb_build_object(
                 'id',        t.id,
                 'name',      t.name,
                 'slug',      t.slug,
                 'category',  t.category,
                 'icon_key',  t.icon_key,
                 'color_hex', t.color_hex,
                 'tech_role', pt.tech_role
               )
               order by pt.sort_order, t.name
             )
      from public.project_technologies pt
      join public.technologies t on t.id = pt.technology_id
      where pt.project_id = p.id and t.published
    ),
    '[]'::jsonb
  ) as technologies
from public.projects p
where p.publication_state = 'published'
  and p.visibility_mode <> 'private';

comment on view public.v_public_projects is
  'PRD 23.20. security_invoker = on so RLS of the underlying tables still applies. Never add a column here that public queries may not see (API-01).';

grant select on public.v_public_projects to anon, authenticated;


-- ========================================================================
-- migration: 20260815091200_create_storage_buckets.sql
-- ========================================================================

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


-- ========================================================================
-- migration: 20260815091300_create_storage_policies.sql
-- ========================================================================

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


-- ========================================================================
-- Seed data (8 files)
-- ========================================================================

-- ========================================================================
-- seed: 01_site_settings.sql
-- ========================================================================

-- =========================================================================
-- 01_site_settings — PRD 28.2, 23.15
--
-- Registered V1 keys. `is_public` mirrors the anon allow-list in 25.1: only
-- these keys are readable without a session, and anything added later is
-- private until deliberately exposed.
--
-- Values marked REQUIRES USER INPUT are seeded as JSON null, not as invented
-- copy. Section 32 of the PRD is explicit: no developer may resolve a
-- [REQUIRES USER INPUT] marker by making something up. The UI treats null as
-- "hide this element" (see the empty-state rules in 12.x), so a fresh database
-- renders correctly rather than showing placeholder text.
-- =========================================================================

insert into public.site_settings (key, value, description, is_public) values

  ('site_title',
   to_jsonb('Moin Patel — AI Developer & AI Automation Executive'::text),
   'Default <title> and og:site_name.',
   true),

  ('site_description',
   to_jsonb('Building AI-powered systems that automate work, save time, and reduce business costs.'::text),
   'Default meta description. The approved positioning line (PRD 2).',
   true),

  ('default_og_image_path',
   'null'::jsonb,
   'Storage path in the profile bucket for the site-wide social preview, 1200x630 (SEO-04). REQUIRES USER INPUT.',
   true),

  ('availability_label',
   'null'::jsonb,
   'Text of the hero availability pill. Q-20: Moin must confirm whether to show it and with what wording. Null hides the pill.',
   true),

  ('contact_response_note',
   'null'::jsonb,
   'Expected response time shown on /contact and the CTA band. Q-19. Null hides the line rather than promising a time nobody agreed to.',
   true),

  ('contact_captcha_enabled',
   'false'::jsonb,
   'FR-CONT-09 Turnstile verification (P2). Off in V1.',
   false),

  ('analytics_enabled',
   'false'::jsonb,
   'ANA-04 master switch. Off until Q-23 is answered.',
   true),

  ('nav_resume_visible',
   'true'::jsonb,
   'Shows the Resume action in the header. Independently gated by an actual published resume existing (FR-RES-06).',
   true),

  ('maintenance_mode',
   'false'::jsonb,
   'Public routes show a maintenance notice; /admin stays reachable (P2).',
   true),

  ('canonical_base_url',
   'null'::jsonb,
   'Canonical origin for SEO-05/SEO-06. Q-11 — BLOCKING for launch. Falls back to VITE_SITE_URL until set.',
   true)

on conflict (key) do update
  set description = excluded.description,
      is_public   = excluded.is_public;
--    value is deliberately NOT updated: re-running the seed must never
--    overwrite a setting Moin has since edited through /admin/settings.


-- ========================================================================
-- seed: 02_profile.sql
-- ========================================================================

-- =========================================================================
-- 02_profile — PRD 28.2, 23.1
--
-- ⚠ UNVERIFIED. The PRD's source-material notice applies: no resume file was
--   supplied, so every fact below comes from the brief's own summary rather
--   than from the resume. Q-01 is BLOCKING — before this content goes to
--   production, the resume PDF must be supplied and each value checked
--   against it line by line.
--
-- Deliberately left NULL rather than invented:
--   short_bio, long_bio_md   Q-12. This project does not write Moin's
--                            biography for him. Null hides the About section
--                            entirely (12.3 empty state) instead of shipping
--                            filler.
--   avatar_path, avatar_alt  Q-04. Null renders the monogram tile (12.12).
--   og_image_path            Q-04 / SEO-04.
--   tagline                  Part of Q-12.
--
-- phone_visible is false by default and stays false: Q-10 asks whether the
-- number should be public at all, and publishing a personal number invites
-- spam calls. The number is stored so the admin has it; nothing renders it.
-- =========================================================================

insert into public.profiles (
  id,
  full_name,
  role_title,
  positioning_line,
  tagline,
  short_bio,
  long_bio_md,
  location,
  email_public,
  phone_public,
  phone_visible,
  avatar_path,
  avatar_alt,
  og_image_path,
  available_for_work,
  published
) values (
  '00000000-0000-4000-a000-000000000001',
  'Moin Patel',
  'AI Developer / AI Automation Executive',
  -- Approved, use verbatim in the hero (PRD 2, 12.12).
  'Building AI-powered systems that automate work, save time, and reduce business costs.',
  null,   -- Q-12
  null,   -- Q-12
  null,   -- Q-12
  'Surat, Gujarat, India',
  'mspatel05831@gmail.com',
  '+91 8530537786',
  false,  -- Q-10
  null,   -- Q-04
  null,   -- Q-04
  null,   -- Q-04
  true,
  true
)
on conflict (id) do nothing;


-- ========================================================================
-- seed: 03_technologies.sql
-- ========================================================================

-- =========================================================================
-- 03_technologies — PRD 28.2
--
-- Seeded from what the described projects ACTUALLY use. Not an aspirational
-- stack list — Principle 1: evidence over adjectives.
--
-- Frontend technologies (React, TypeScript, Supabase/PostgreSQL) are absent on
-- purpose. Q-05 asks whether they should appear; they are implied by the
-- projects but are not in the skills list Moin supplied, and this seed does
-- not add them unsupported. Add them in a follow-up seed once Q-05 is answered.
-- =========================================================================

insert into public.technologies (id, name, slug, category, icon_key, sort_order) values
  ('00000000-0000-4000-b000-000000000001', 'Node.js',                'nodejs',                  'language',        'nodejs',     10),
  ('00000000-0000-4000-b000-000000000002', 'SQL',                    'sql',                     'language',        'database',   20),
  ('00000000-0000-4000-b000-000000000003', 'Git',                    'git',                     'devops',          'git',        30),
  ('00000000-0000-4000-b000-000000000004', 'Google Apps Script',     'google-apps-script',      'automation_tool', 'script',     40),
  ('00000000-0000-4000-b000-000000000005', 'Gemini 2.5 Flash',       'gemini-2-5-flash',        'ai_service',      'sparkles',   50),
  ('00000000-0000-4000-b000-000000000006', 'OCR',                    'ocr',                     'ai_service',      'scan',       60),
  ('00000000-0000-4000-b000-000000000007', 'Google Sheets',          'google-sheets',           'business_tool',   'sheet',      70),
  ('00000000-0000-4000-b000-000000000008', 'Petpooja POS',           'petpooja-pos',            'business_tool',   'pos',        80),
  ('00000000-0000-4000-b000-000000000009', 'Google Workspace',       'google-workspace',        'business_tool',   'workspace',  90),
  ('00000000-0000-4000-b000-00000000000a', 'Microsoft Excel',        'microsoft-excel',         'business_tool',   'sheet',     100),
  ('00000000-0000-4000-b000-00000000000b', 'Google Business Profile','google-business-profile', 'business_tool',   'store',     110),
  ('00000000-0000-4000-b000-00000000000c', 'Zomato Merchant',        'zomato-merchant',         'business_tool',   'store',     120),
  ('00000000-0000-4000-b000-00000000000d', 'Swiggy Merchant',        'swiggy-merchant',         'business_tool',   'store',     130)
on conflict (id) do nothing;


-- ========================================================================
-- seed: 04_skill_categories_skills.sql
-- ========================================================================

-- =========================================================================
-- 04_skill_categories_skills — PRD 16, 28.2
--
-- Exactly the three categories and their skills from Section 16. Nothing
-- added: Q-05 covers whether React, TypeScript, Supabase/PostgreSQL, Google
-- Apps Script and Gemini API should also appear here.
--
-- There is no proficiency value anywhere below, because the column does not
-- exist (FR-SKILL-03, 23.11). `is_core` and ordering are the only emphasis.
-- =========================================================================

insert into public.skill_categories (id, name, slug, sort_order, published) values
  ('00000000-0000-4000-c000-000000000001', 'Programming & Development', 'programming-development', 10, true),
  ('00000000-0000-4000-c000-000000000002', 'AI & Automation',           'ai-automation',           20, true),
  ('00000000-0000-4000-c000-000000000003', 'Business Tools',            'business-tools',          30, true)
on conflict (id) do nothing;

insert into public.skills (id, category_id, name, slug, is_core, sort_order, published) values
  -- Programming & Development
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', 'Node.js',                         'nodejs',                      true,  10, true),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000001', 'SQL',                             'sql',                         true,  20, true),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000001', 'Git',                             'git',                         false, 30, true),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-c000-000000000001', 'Web Application Development',     'web-application-development', true,  40, true),

  -- AI & Automation
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-c000-000000000002', 'AI Automation',                   'ai-automation',               true,  10, true),
  ('00000000-0000-4000-d000-000000000006', '00000000-0000-4000-c000-000000000002', 'Workflow Automation',             'workflow-automation',         true,  20, true),
  ('00000000-0000-4000-d000-000000000007', '00000000-0000-4000-c000-000000000002', 'Business Process Automation',     'business-process-automation', true,  30, true),
  ('00000000-0000-4000-d000-000000000008', '00000000-0000-4000-c000-000000000002', 'Operational Digitisation',        'operational-digitisation',    false, 40, true),

  -- Business Tools
  ('00000000-0000-4000-d000-000000000009', '00000000-0000-4000-c000-000000000003', 'Petpooja POS',                    'petpooja-pos',                false, 10, true),
  ('00000000-0000-4000-d000-00000000000a', '00000000-0000-4000-c000-000000000003', 'Google Workspace',                'google-workspace',            false, 20, true),
  ('00000000-0000-4000-d000-00000000000b', '00000000-0000-4000-c000-000000000003', 'Microsoft Excel',                 'microsoft-excel',             false, 30, true),
  ('00000000-0000-4000-d000-00000000000c', '00000000-0000-4000-c000-000000000003', 'Google Business Profile',         'google-business-profile',     false, 40, true),
  ('00000000-0000-4000-d000-00000000000d', '00000000-0000-4000-c000-000000000003', 'Zomato Merchant',                 'zomato-merchant',             false, 50, true),
  ('00000000-0000-4000-d000-00000000000e', '00000000-0000-4000-c000-000000000003', 'Swiggy Merchant',                 'swiggy-merchant',             false, 60, true)
on conflict (id) do nothing;


-- ========================================================================
-- seed: 05_experience.sql
-- ========================================================================

-- =========================================================================
-- 05_experience — PRD 15, 28.2
--
-- ⚠ UNVERIFIED, and two open questions sit on this record:
--
--   Q-08  The exact legal entity name. The brief says "Bookends Private
--         Limited"; other material for the same group uses "Bookends
--         Hospitality Pvt. Ltd." The brief's wording is used below and must be
--         corrected against the resume before launch.
--   Q-09  Confirm the April 2026 start date, and whether all three titles are
--         current and concurrent.
--
-- FR-EXP-06: the three concurrent titles are ONE record with titles separated
-- by ' · '. Three rows would render as three employers, which would misstate
-- the CV.
--
-- Achievements are absent, not empty: Q-15 / Section 15 permit achievement
-- rows only where the resume states specific, verifiable ones. Inventing
-- achievements is prohibited (Principle 4, AC-CONTENT-1).
-- =========================================================================

insert into public.experience (
  id, company, company_url, role_title, employment_type, location,
  start_date, end_date, is_current, summary_md, publication_state, sort_order
) values (
  '00000000-0000-4000-e000-000000000001',
  'Bookends Private Limited',   -- Q-08
  null,
  'Automation Executive · Head of Reservations · External Platform Coordinator',
  'Full-time',
  'Surat, Gujarat',
  '2026-04-01',                 -- Q-09
  null,
  true,
  null,
  'published',
  10
)
on conflict (id) do nothing;

-- Responsibilities, taken verbatim in substance from the brief (PRD 15).
insert into public.experience_items (id, experience_id, item_type, content, sort_order) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Centralised reservation operations across outlets.', 10),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Managed external platforms — Petpooja, Zomato, Swiggy and Google Business Profile.', 20),
  ('00000000-0000-4000-f000-000000000003', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Built AI-powered automation for repetitive operational work.', 30),
  ('00000000-0000-4000-f000-000000000004', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Built internal web applications used by operations staff.', 40),
  ('00000000-0000-4000-f000-000000000005', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Designed reservation, feedback and reporting workflows.', 50),
  ('00000000-0000-4000-f000-000000000006', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Optimised manual processes and coordinated across functions to improve operational efficiency.', 60)
on conflict (id) do nothing;

-- FR-EXP-04 — tools used in the role, drawn from the seeded technology list.
insert into public.experience_technologies (experience_id, technology_id, sort_order) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000008', 10),  -- Petpooja POS
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-00000000000c', 20),  -- Zomato Merchant
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-00000000000d', 30),  -- Swiggy Merchant
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-00000000000b', 40),  -- Google Business Profile
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000009', 50),  -- Google Workspace
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000007', 60)   -- Google Sheets
on conflict (experience_id, technology_id) do nothing;


-- ========================================================================
-- seed: 06_education.sql
-- ========================================================================

-- =========================================================================
-- 06_education — PRD 17, 28.2
--
-- ⚠ UNVERIFIED pending the resume (Q-01).
--
-- Q-18: Class X and XII are seeded as DRAFT. The PRD's reasoning stands — for
-- a portfolio aimed at business clients and technical hiring managers, school
-- percentages add nothing, and the board and institution names for both are
-- still [REQUIRES USER INPUT]. The records exist so Moin can publish them from
-- /admin/education in one click if he disagrees; nothing is lost by defaulting
-- to hidden.
--
-- show_grade is false on every row. FR-EDU-04 renders a grade only when it is
-- populated AND explicitly switched on.
-- =========================================================================

insert into public.education (
  id, institution, qualification, field_of_study, location,
  start_date, end_date, status, grade_label, show_grade,
  description, publication_state, sort_order
) values

  (
    '00000000-0000-4000-a100-000000000001',
    'C.K. Pithawala College',
    'Bachelor of Commerce (B.Com.)',
    'Commerce',
    'Surat, Gujarat',
    null,
    '2027-06-30',
    'expected',          -- renders explicitly as "Expected 2027" (FR-EDU-03)
    null,
    false,
    null,
    'published',
    10
  ),

  (
    '00000000-0000-4000-a100-000000000002',
    'REQUIRES USER INPUT — institution name',   -- Q-18
    'Class XII',
    null,
    null,
    null,
    null,
    'completed',
    '70%',
    false,               -- Q-18
    null,
    'draft',             -- not published; see header
    20
  ),

  (
    '00000000-0000-4000-a100-000000000003',
    'REQUIRES USER INPUT — institution name',   -- Q-18
    'Class X',
    null,
    null,
    null,
    null,
    'completed',
    '63%',
    false,               -- Q-18
    null,
    'draft',             -- not published; see header
    30
  )

on conflict (id) do nothing;


-- ========================================================================
-- seed: 07_social_links.sql
-- ========================================================================

-- =========================================================================
-- 07_social_links — PRD 28.2
--
-- "published only where a URL exists."
--
-- LinkedIn (Q-02) and GitHub (Q-03) are seeded as UNPUBLISHED rows carrying a
-- placeholder URL. Two reasons for rows rather than nothing:
--
--   1. They are unpublished, so no public query returns them (25.1) and the
--      hero/footer simply omit the icons (12.11, 12.12 empty states).
--   2. Moin fills in the real URL in /admin/social-links and flips one switch,
--      instead of hand-building the rows.
--
-- The placeholder satisfies the https:// CHECK constraint without pretending
-- to be a real profile. Publishing one of these as-is would produce a dead
-- link in the hero, which is exactly the Persona-1 failure mode.
-- =========================================================================

insert into public.social_links (
  id, platform, label, url, icon_key, show_in_hero, show_in_footer, sort_order, published
) values

  (
    '00000000-0000-4000-a200-000000000001',
    'linkedin',
    'LinkedIn',
    'https://www.linkedin.com/in/REQUIRES-USER-INPUT',   -- Q-02
    'linkedin',
    true, true, 10,
    false
  ),

  (
    '00000000-0000-4000-a200-000000000002',
    'github',
    'GitHub',
    'https://github.com/REQUIRES-USER-INPUT',           -- Q-03
    'github',
    true, true, 20,
    false
  ),

  -- The one link we can stand behind today.
  (
    '00000000-0000-4000-a200-000000000003',
    'email',
    'Email',
    'mailto:mspatel05831@gmail.com',
    'mail',
    true, true, 30,
    true
  )

on conflict (id) do nothing;


-- ========================================================================
-- seed: 08_projects.sql
-- ========================================================================

-- =========================================================================
-- 08_projects — PRD 28.2, 28.3
--
-- ALL THREE PROJECTS ARE SEEDED AS DRAFT. This is not caution for its own
-- sake — 28.1 requires it: "Any project whose disclosure is unconfirmed is
-- seeded with publication_state = 'draft'." Q-06 and Q-07 are BLOCKING and
-- unanswered, and R-02 rates publishing employer-owned detail without
-- permission as a severe risk.
--
-- Consequence to be aware of: a fresh database renders /projects with the
-- neutral "case studies are being added" empty state (FR-PROJ-10). That is
-- correct behaviour, not a broken build.
--
-- client_disclosed = false on every row (FR-PROJ-16), so no employer or client
-- name renders anywhere in this content — and none is written into the copy
-- below either, since a flag cannot redact prose.
--
-- Every impact statement is qualitative. There is not one percentage, currency
-- figure or hours-saved number in this file, because none has been measured
-- and approved (Principle 4, FR-HOME-05a, Q-15, AC-CONTENT-1). If Moin
-- supplies measured figures, they are added then — not now, "as a placeholder".
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Recipe Costing & Restaurant Operations System
-- -------------------------------------------------------------------------
insert into public.projects (
  id, slug, title, summary,
  description_md, problem_md, solution_md, business_impact_md,
  status, category, publication_state, visibility_mode,
  is_featured, sort_order, client_disclosed, confidentiality_note
) values (
  '00000000-0000-4000-a300-000000000001',
  'recipe-costing-restaurant-operations-system',
  'Recipe Costing & Restaurant Operations System',
  'A centralised web application that replaced spreadsheet-based recipe costing with automated costing and pricing.',

  -- Overview
  'A web application for managing recipes and the costing that sits behind them, built to replace a spreadsheet-driven process with a single system that everyone works from.',

  -- The Problem — written for a restaurant operator, not an engineer (12.x,
  -- Persona 2). Plain language first; the mechanism comes later in the page.
  'Recipe costing was maintained manually in spreadsheets. Every ingredient price change meant reopening files and reworking figures by hand, recipe information lived in more than one place, and there was no single version anyone could trust when it came time to set a price.',

  -- The Solution
  'A centralised web application for recipe management, with costing and pricing calculations performed automatically from the underlying ingredient data. Recipes are entered and maintained in one place, and the costing follows from them rather than being reconstructed by hand each time.',

  -- Business Impact — qualitative only. See file header.
  E'- Reduced dependence on spreadsheets for a process that had outgrown them.\n- Centralised recipe information in one system instead of several files.\n- Improved consistency between recipes and the costs attached to them.\n- Made pricing decisions faster, because the costing is already current.',

  'completed',
  'web_application',
  'draft',            -- Q-07
  'case_study_only',  -- no public repo or demo confirmed (Q-03, Q-14)
  true,
  10,
  false,              -- Q-07
  'Built for an employer. Disclosure permission not yet confirmed — Q-07. Do not publish, and do not name the employer in copy or screenshots, until written permission exists (R-02, SEC-13).'
)
on conflict (id) do nothing;

insert into public.project_technologies (project_id, technology_id, tech_role, sort_order) values
  ('00000000-0000-4000-a300-000000000001', '00000000-0000-4000-b000-000000000001', 'primary',    10),  -- Node.js
  ('00000000-0000-4000-a300-000000000001', '00000000-0000-4000-b000-000000000002', 'primary',    20),  -- SQL
  ('00000000-0000-4000-a300-000000000001', '00000000-0000-4000-b000-000000000003', 'supporting', 30)   -- Git
on conflict (project_id, technology_id) do nothing;


-- -------------------------------------------------------------------------
-- 2. Capiche AI Feedback Automation
-- -------------------------------------------------------------------------
insert into public.projects (
  id, slug, title, summary,
  description_md, problem_md, solution_md, how_it_works_md, business_impact_md,
  status, category, publication_state, visibility_mode,
  is_featured, sort_order, client_disclosed, confidentiality_note
) values (
  '00000000-0000-4000-a300-000000000002',
  'capiche-ai-feedback-automation',
  'Capiche AI Feedback Automation',
  'An automated pipeline that turns scanned handwritten feedback cards into structured, queryable data.',

  'A processing pipeline that takes physical, handwritten feedback cards and produces structured records that can be reported on — removing the manual transcription step between a customer writing something down and anyone being able to see a trend.',

  -- The Problem — the business framing specified in 28.3.
  'Handwritten feedback had to be read and typed up by staff before anyone could see a pattern in it. That transcription step was slow, it was the only thing standing between the feedback and any kind of analysis, and the output varied depending on who did the typing.',

  'An automated pipeline that reads the scanned cards, structures what they contain, checks and de-duplicates the result, and writes it into the operational sheet the business already uses for reporting.',

  -- How It Works — prose overview. The ordered mechanism itself lives in
  -- project_pipeline_steps below, which is what FR-CASE-04 renders as a
  -- numbered visual. This paragraph does not duplicate those steps.
  'Feedback cards are scanned as images. Text is extracted from the scans, then interpreted and structured into a consistent record shape. Sentiment and themes are classified, the structured records are validated against rule checks and de-duplicated, and only then is the output written to Google Sheets, where the existing reporting and trend review runs on it.',

  -- Qualitative. The time saving is real but unmeasured — Q-15.
  E'- Removed the manual transcription step between handwritten feedback and analysis.\n- Standardised the output, so records have the same shape regardless of who or what produced them.\n- Made the feedback queryable, so themes and sentiment can be reviewed rather than read card by card.',

  'completed',
  'ai_automation',
  'draft',            -- Q-06
  'case_study_only',
  true,
  20,
  false,              -- Q-06
  'Employer-owned system. Q-06: confirm whether it may be published at all, and whether the client/brand may be named. If naming is refused, the anonymised framing ("a multi-outlet restaurant group") is the fallback. Written permission strongly advised (R-02).'
)
on conflict (id) do nothing;

-- 28.3 — the pipeline as structured data, not prose (TD-10). This is what
-- makes the case study prove competence rather than assert it.
insert into public.project_pipeline_steps (id, project_id, step_number, label, description, tech_note, icon_key) values
  ('00000000-0000-4000-a400-000000000001', '00000000-0000-4000-a300-000000000002', 1, 'Scanned handwritten feedback', 'Physical feedback cards captured as scans.',                       null,                'scan'),
  ('00000000-0000-4000-a400-000000000002', '00000000-0000-4000-a300-000000000002', 2, 'OCR',                          'Text extraction from the scanned images.',                         'OCR',               'text'),
  ('00000000-0000-4000-a400-000000000003', '00000000-0000-4000-a300-000000000002', 3, 'Structuring',                  'Interpretation of the extracted text into a consistent shape.',    'Gemini 2.5 Flash',  'sparkles'),
  ('00000000-0000-4000-a400-000000000004', '00000000-0000-4000-a300-000000000002', 4, 'Sentiment processing',         'Sentiment and theme classification.',                              'NLP',               'gauge'),
  ('00000000-0000-4000-a400-000000000005', '00000000-0000-4000-a300-000000000002', 5, 'Information extraction',       'Fields pulled into a consistent record shape.',                     null,                'braces'),
  ('00000000-0000-4000-a400-000000000006', '00000000-0000-4000-a300-000000000002', 6, 'Validation',                   'Rule checks before data is accepted.',                             null,                'check'),
  ('00000000-0000-4000-a400-000000000007', '00000000-0000-4000-a300-000000000002', 7, 'De-duplication',               'Repeat submissions collapsed.',                                    null,                'layers'),
  ('00000000-0000-4000-a400-000000000008', '00000000-0000-4000-a300-000000000002', 8, 'Structured output',            'Written to the operational sheet.',                                'Google Sheets',     'sheet'),
  ('00000000-0000-4000-a400-000000000009', '00000000-0000-4000-a300-000000000002', 9, 'Business intelligence',        'Reporting and trend review on the collected data.',                 null,                'chart')
on conflict (id) do nothing;

insert into public.project_technologies (project_id, technology_id, tech_role, sort_order) values
  ('00000000-0000-4000-a300-000000000002', '00000000-0000-4000-b000-000000000006', 'primary',    10),  -- OCR
  ('00000000-0000-4000-a300-000000000002', '00000000-0000-4000-b000-000000000005', 'primary',    20),  -- Gemini 2.5 Flash
  ('00000000-0000-4000-a300-000000000002', '00000000-0000-4000-b000-000000000007', 'primary',    30),  -- Google Sheets
  ('00000000-0000-4000-a300-000000000002', '00000000-0000-4000-b000-000000000004', 'supporting', 40)   -- Google Apps Script
on conflict (project_id, technology_id) do nothing;


-- -------------------------------------------------------------------------
-- 3. Exam Build Platform
--
-- Status is in_progress, and the copy below says so plainly. Principle 3 and
-- rule 9 of 43.4: in-progress means in-progress in EVERY surface. There is no
-- completed-state language in this record.
--
-- how_it_works_md and the pipeline steps are deliberately absent. Q-16 asks
-- what is genuinely built today versus planned; until that is answered, this
-- seed states the intended scope and does not claim any part of it is
-- finished. Writing "user management is built" without confirmation would be
-- exactly the fabrication the PRD prohibits.
-- -------------------------------------------------------------------------
insert into public.projects (
  id, slug, title, summary,
  description_md, problem_md, solution_md,
  status, category, publication_state, visibility_mode,
  is_featured, sort_order, client_disclosed, confidentiality_note
) values (
  '00000000-0000-4000-a300-000000000003',
  'exam-build-platform',
  'Exam Build Platform',
  'In progress — a platform for building and running exams, covering candidates, exams and evaluation.',

  'A platform for creating and running exams end to end. **This project is in progress.** The scope below describes what the platform is being built to do, not what is finished.',

  'Running exams across users, candidates and evaluation involves several separate manual processes that do not share data with each other.',

  E'The platform is being built around five areas:\n\n- User management\n- Exam management\n- Candidate management\n- Automated evaluation\n- A scalable architecture underneath all of it\n\nWhich of these are complete today is being confirmed before this case study is published.',

  'in_progress',
  'web_application',
  'draft',            -- Q-07, Q-16
  'case_study_only',
  false,              -- not featured: an in-progress project should not be one
                      -- of the three proof points on the homepage
  30,
  false,              -- Q-07
  'Q-07: confirm who this is for and whether it may be published. Q-16: confirm what is genuinely built versus planned before any how-it-works content is written. Must render as In Progress everywhere (Principle 3).'
)
on conflict (id) do nothing;

insert into public.project_technologies (project_id, technology_id, tech_role, sort_order) values
  ('00000000-0000-4000-a300-000000000003', '00000000-0000-4000-b000-000000000001', 'primary',    10),  -- Node.js
  ('00000000-0000-4000-a300-000000000003', '00000000-0000-4000-b000-000000000002', 'primary',    20),  -- SQL
  ('00000000-0000-4000-a300-000000000003', '00000000-0000-4000-b000-000000000003', 'supporting', 30)   -- Git
on conflict (project_id, technology_id) do nothing;


-- ========================================================================
-- Commit
-- ========================================================================

commit;

-- ========================================================================
-- Tell PostgREST to reload its schema cache
-- ========================================================================
--
-- Without this, the new tables can appear to be missing for up to a minute —
-- the API answers "Could not find the table in the schema cache", which looks
-- identical to the migration having failed.

notify pgrst, 'reload schema';
