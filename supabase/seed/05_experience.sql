-- =========================================================================
-- 05_experience — PRD 15, 28.2
--
-- ⚠ UNVERIFIED, and two open questions sit on this record:
--
--   Q-08  The exact legal entity name. The brief says "Bookends Private
--         Limited"; other material for the same group uses "Bookends
--         Hospitality Pvt. Ltd." The brief's wording is used below and must be
--         corrected against the resume before launch.
--   Q-09  Confirm the April 2026 start date, and whether all three titles are
--         current and concurrent.
--
-- FR-EXP-06: the three concurrent titles are ONE record with titles separated
-- by ' · '. Three rows would render as three employers, which would misstate
-- the CV.
--
-- Achievements are absent, not empty: Q-15 / Section 15 permit achievement
-- rows only where the resume states specific, verifiable ones. Inventing
-- achievements is prohibited (Principle 4, AC-CONTENT-1).
-- =========================================================================

insert into public.experience (
  id, company, company_url, role_title, employment_type, location,
  start_date, end_date, is_current, summary_md, publication_state, sort_order
) values (
  '00000000-0000-4000-e000-000000000001',
  'Bookends Private Limited',   -- Q-08
  null,
  'Automation Executive · Head of Reservations · External Platform Coordinator',
  'Full-time',
  'Surat, Gujarat',
  '2026-04-01',                 -- Q-09
  null,
  true,
  null,
  'published',
  10
)
on conflict (id) do nothing;

-- Responsibilities, taken verbatim in substance from the brief (PRD 15).
insert into public.experience_items (id, experience_id, item_type, content, sort_order) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Centralised reservation operations across outlets.', 10),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Managed external platforms — Petpooja, Zomato, Swiggy and Google Business Profile.', 20),
  ('00000000-0000-4000-f000-000000000003', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Built AI-powered automation for repetitive operational work.', 30),
  ('00000000-0000-4000-f000-000000000004', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Built internal web applications used by operations staff.', 40),
  ('00000000-0000-4000-f000-000000000005', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Designed reservation, feedback and reporting workflows.', 50),
  ('00000000-0000-4000-f000-000000000006', '00000000-0000-4000-e000-000000000001', 'responsibility',
   'Optimised manual processes and coordinated across functions to improve operational efficiency.', 60)
on conflict (id) do nothing;

-- FR-EXP-04 — tools used in the role, drawn from the seeded technology list.
insert into public.experience_technologies (experience_id, technology_id, sort_order) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000008', 10),  -- Petpooja POS
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-00000000000c', 20),  -- Zomato Merchant
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-00000000000d', 30),  -- Swiggy Merchant
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-00000000000b', 40),  -- Google Business Profile
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000009', 50),  -- Google Workspace
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000007', 60)   -- Google Sheets
on conflict (experience_id, technology_id) do nothing;
