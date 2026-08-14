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
