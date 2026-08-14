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
