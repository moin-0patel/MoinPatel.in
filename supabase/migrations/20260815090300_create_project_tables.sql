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
  constraint projects_slug_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 80),
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
