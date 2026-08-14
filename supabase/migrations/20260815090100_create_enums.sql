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
