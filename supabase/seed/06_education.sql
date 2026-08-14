-- =========================================================================
-- 06_education — PRD 17, 28.2
--
-- ⚠ UNVERIFIED pending the resume (Q-01).
--
-- Q-18: Class X and XII are seeded as DRAFT. The PRD's reasoning stands — for
-- a portfolio aimed at business clients and technical hiring managers, school
-- percentages add nothing, and the board and institution names for both are
-- still [REQUIRES USER INPUT]. The records exist so Moin can publish them from
-- /admin/education in one click if he disagrees; nothing is lost by defaulting
-- to hidden.
--
-- show_grade is false on every row. FR-EDU-04 renders a grade only when it is
-- populated AND explicitly switched on.
-- =========================================================================

insert into public.education (
  id, institution, qualification, field_of_study, location,
  start_date, end_date, status, grade_label, show_grade,
  description, publication_state, sort_order
) values

  (
    '00000000-0000-4000-a100-000000000001',
    'C.K. Pithawala College',
    'Bachelor of Commerce (B.Com.)',
    'Commerce',
    'Surat, Gujarat',
    null,
    '2027-06-30',
    'expected',          -- renders explicitly as "Expected 2027" (FR-EDU-03)
    null,
    false,
    null,
    'published',
    10
  ),

  (
    '00000000-0000-4000-a100-000000000002',
    'REQUIRES USER INPUT — institution name',   -- Q-18
    'Class XII',
    null,
    null,
    null,
    null,
    'completed',
    '70%',
    false,               -- Q-18
    null,
    'draft',             -- not published; see header
    20
  ),

  (
    '00000000-0000-4000-a100-000000000003',
    'REQUIRES USER INPUT — institution name',   -- Q-18
    'Class X',
    null,
    null,
    null,
    null,
    'completed',
    '63%',
    false,               -- Q-18
    null,
    'draft',             -- not published; see header
    30
  )

on conflict (id) do nothing;
