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
