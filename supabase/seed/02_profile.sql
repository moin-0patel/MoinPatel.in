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
