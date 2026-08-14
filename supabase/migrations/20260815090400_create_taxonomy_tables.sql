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
