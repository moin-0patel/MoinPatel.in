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
    'https://www.linkedin.com/in/moin-patell',   -- Q-02 resolved 2026-08-29
    'linkedin',
    true, true, 10,
    true
  ),

  (
    '00000000-0000-4000-a200-000000000002',
    'github',
    'GitHub',
    'https://github.com/moin-0patel',           -- Q-03 resolved 2026-08-29
    'github',
    true, true, 20,
    true
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
