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
