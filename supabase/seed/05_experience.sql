-- =========================================================================
-- 05_experience — PRD 15, 28.2
--
-- ⚠ UNVERIFIED, and one open question still sits on these records:
--
--   Q-08  The exact legal entity name. The brief says "Bookends Private
--         Limited"; other material for the same group uses "Bookends
--         Hospitality Pvt. Ltd." The brief's wording is used below and must be
--         corrected against the resume before launch.
--
--   Q-09  ANSWERED (owner, 2026-08-28). The titles are NOT concurrent. The
--         Bookends tenure is two SEQUENTIAL roles: Reservationist from April
--         2026, then AI Automation Executive from June 2026, which is current.
--         June is the changeover month, so the boundary is taken as 31 May /
--         1 June rather than overlapping both records across June.
--
-- WHY TWO ROWS HERE AND NOT ONE
--
-- FR-EXP-06 folds CONCURRENT titles at one company into a single record with
-- ' · ' separators, because three simultaneous titles rendered as three rows
-- would read as three employers. That rule does not apply to a progression:
-- these are two different roles held one after the other, with different date
-- ranges and different work, and collapsing them would hide the promotion and
-- misstate when each was held. Two rows is the honest shape.
--
-- ORDER — CHRONOLOGICAL, by owner decision (2026-08-29): "it should go
-- according to date or month". The journey timeline reads oldest -> newest,
-- so the Reservationist role takes sort_order 10 and the current AI role
-- takes 20. This supersedes the `newest first` reading of FR-EXP-01/03 that
-- this file previously followed; both readers sort by `sort_order` ascending,
-- so the swap applies everywhere experience renders (home journey, /resume).
--
-- Achievements are absent, not empty: Q-15 / Section 15 permit achievement
-- rows only where the resume states specific, verifiable ones. Inventing
-- achievements is prohibited (Principle 4, AC-CONTENT-1).
-- =========================================================================

-- -------------------------------------------------------------------------
-- CURRENT — AI Automation Executive (June 2026 → present)
-- -------------------------------------------------------------------------
insert into public.experience (
  id, company, company_url, role_title, employment_type, location,
  start_date, end_date, is_current, summary_md, publication_state, sort_order
) values (
  '00000000-0000-4000-e000-000000000001',
  'Bookends Private Limited',   -- Q-08
  null,
  'AI Automation Executive',
  'Full-time',
  'Surat, Gujarat',
  '2026-06-01',
  -- AC-EXP-3: a current role renders "Present" and the schema refuses an
  -- end_date alongside is_current.
  null,
  true,
  null,
  'published',
  20
)
on conflict (id) do nothing;

-- -------------------------------------------------------------------------
-- EARLIER — Reservationist (April → May 2026)
-- -------------------------------------------------------------------------
insert into public.experience (
  id, company, company_url, role_title, employment_type, location,
  start_date, end_date, is_current, summary_md, publication_state, sort_order
) values (
  '00000000-0000-4000-e000-000000000002',
  'Bookends Private Limited',   -- Q-08
  null,
  'Reservationist',
  'Full-time',
  'Surat, Gujarat',
  '2026-04-01',
  '2026-05-31',
  false,
  null,
  'published',
  10
)
on conflict (id) do nothing;

-- Responsibilities, taken verbatim in substance from the brief (PRD 15) and
-- split by subject across the two roles — the reservation and platform work
-- belongs to the Reservationist role, the automation and application work to
-- the AI role. No bullet was reworded, added or dropped in the split.
insert into public.experience_items (id, experience_id, item_type, content, sort_order) values
  -- AI Automation Executive
  ('00000000-0000-4000-f000-000000000003', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Built AI-powered automation for repetitive operational work.', 10),
  ('00000000-0000-4000-f000-000000000004', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Built internal web applications used by operations staff.', 20),
  -- Reservationist
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-e000-000000000002', 'responsibility',
   'Centralised reservation operations across outlets.', 10),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-e000-000000000002', 'responsibility',
   'Managed external platforms — Petpooja, Zomato, Swiggy and Google Business Profile.', 20),
  ('00000000-0000-4000-f000-000000000005', '00000000-0000-4000-e000-000000000002', 'responsibility',
   'Designed reservation, feedback and reporting workflows.', 30),
  ('00000000-0000-4000-f000-000000000006', '00000000-0000-4000-e000-000000000002', 'responsibility',
   'Optimised manual processes and coordinated across functions to improve operational efficiency.', 40)
on conflict (id) do nothing;

-- FR-EXP-04 — tools used in the role, drawn from the seeded technology list.
--
-- All six sit on the Reservationist record: each is a reservation or storefront
-- platform, and the responsibility bullet above names four of them explicitly.
-- The AI role carries NO technology rows on purpose — the brief states what it
-- built ("AI-powered automation", "internal web applications") but never which
-- stack it used, and assigning one would be an invented fact under Principle 4.
-- Attach them once the resume confirms them.
insert into public.experience_technologies (experience_id, technology_id, sort_order) values
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-000000000008', 10),  -- Petpooja POS
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-00000000000c', 20),  -- Zomato Merchant
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-00000000000d', 30),  -- Swiggy Merchant
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-00000000000b', 40),  -- Google Business Profile
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-000000000009', 50),  -- Google Workspace
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-000000000007', 60)   -- Google Sheets
on conflict (experience_id, technology_id) do nothing;
