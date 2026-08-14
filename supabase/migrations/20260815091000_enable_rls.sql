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
