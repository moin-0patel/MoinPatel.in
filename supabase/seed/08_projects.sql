-- =========================================================================
-- 08_projects — PRD 28.2, 28.3
--
-- ALL THREE PROJECTS ARE SEEDED AS DRAFT. This is not caution for its own
-- sake — 28.1 requires it: "Any project whose disclosure is unconfirmed is
-- seeded with publication_state = 'draft'." Q-06 and Q-07 are BLOCKING and
-- unanswered, and R-02 rates publishing employer-owned detail without
-- permission as a severe risk.
--
-- Consequence to be aware of: a fresh database renders /projects with the
-- neutral "case studies are being added" empty state (FR-PROJ-10). That is
-- correct behaviour, not a broken build.
--
-- client_disclosed = false on every row (FR-PROJ-16), so no employer or client
-- name renders anywhere in this content — and none is written into the copy
-- below either, since a flag cannot redact prose.
--
-- Every impact statement is qualitative. There is not one percentage, currency
-- figure or hours-saved number in this file, because none has been measured
-- and approved (Principle 4, FR-HOME-05a, Q-15, AC-CONTENT-1). If Moin
-- supplies measured figures, they are added then — not now, "as a placeholder".
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Recipe Costing & Restaurant Operations System
-- -------------------------------------------------------------------------
insert into public.projects (
  id, slug, title, summary,
  description_md, problem_md, solution_md, business_impact_md,
  status, category, publication_state, visibility_mode,
  is_featured, sort_order, client_disclosed, confidentiality_note
) values (
  '00000000-0000-4000-a300-000000000001',
  'recipe-costing-restaurant-operations-system',
  'Recipe Costing & Restaurant Operations System',
  'A centralised web application that replaced spreadsheet-based recipe costing with automated costing and pricing.',

  -- Overview
  'A web application for managing recipes and the costing that sits behind them, built to replace a spreadsheet-driven process with a single system that everyone works from.',

  -- The Problem — written for a restaurant operator, not an engineer (12.x,
  -- Persona 2). Plain language first; the mechanism comes later in the page.
  'Recipe costing was maintained manually in spreadsheets. Every ingredient price change meant reopening files and reworking figures by hand, recipe information lived in more than one place, and there was no single version anyone could trust when it came time to set a price.',

  -- The Solution
  'A centralised web application for recipe management, with costing and pricing calculations performed automatically from the underlying ingredient data. Recipes are entered and maintained in one place, and the costing follows from them rather than being reconstructed by hand each time.',

  -- Business Impact — qualitative only. See file header.
  E'- Reduced dependence on spreadsheets for a process that had outgrown them.\n- Centralised recipe information in one system instead of several files.\n- Improved consistency between recipes and the costs attached to them.\n- Made pricing decisions faster, because the costing is already current.',

  'completed',
  'web_application',
  'draft',            -- Q-07
  'case_study_only',  -- no public repo or demo confirmed (Q-03, Q-14)
  true,
  10,
  false,              -- Q-07
  'Built for an employer. Disclosure permission not yet confirmed — Q-07. Do not publish, and do not name the employer in copy or screenshots, until written permission exists (R-02, SEC-13).'
)
on conflict (id) do nothing;

insert into public.project_technologies (project_id, technology_id, tech_role, sort_order) values
  ('00000000-0000-4000-a300-000000000001', '00000000-0000-4000-b000-000000000001', 'primary',    10),  -- Node.js
  ('00000000-0000-4000-a300-000000000001', '00000000-0000-4000-b000-000000000002', 'primary',    20),  -- SQL
  ('00000000-0000-4000-a300-000000000001', '00000000-0000-4000-b000-000000000003', 'supporting', 30)   -- Git
on conflict (project_id, technology_id) do nothing;


-- -------------------------------------------------------------------------
-- 2. Capiche AI Feedback Automation
-- -------------------------------------------------------------------------
insert into public.projects (
  id, slug, title, summary,
  description_md, problem_md, solution_md, how_it_works_md, business_impact_md,
  status, category, publication_state, visibility_mode,
  is_featured, sort_order, client_disclosed, confidentiality_note
) values (
  '00000000-0000-4000-a300-000000000002',
  'capiche-ai-feedback-automation',
  'Capiche AI Feedback Automation',
  'An automated pipeline that turns scanned handwritten feedback cards into structured, queryable data.',

  'A processing pipeline that takes physical, handwritten feedback cards and produces structured records that can be reported on — removing the manual transcription step between a customer writing something down and anyone being able to see a trend.',

  -- The Problem — the business framing specified in 28.3.
  'Handwritten feedback had to be read and typed up by staff before anyone could see a pattern in it. That transcription step was slow, it was the only thing standing between the feedback and any kind of analysis, and the output varied depending on who did the typing.',

  'An automated pipeline that reads the scanned cards, structures what they contain, checks and de-duplicates the result, and writes it into the operational sheet the business already uses for reporting.',

  -- How It Works — prose overview. The ordered mechanism itself lives in
  -- project_pipeline_steps below, which is what FR-CASE-04 renders as a
  -- numbered visual. This paragraph does not duplicate those steps.
  'Feedback cards are scanned as images. Text is extracted from the scans, then interpreted and structured into a consistent record shape. Sentiment and themes are classified, the structured records are validated against rule checks and de-duplicated, and only then is the output written to Google Sheets, where the existing reporting and trend review runs on it.',

  -- Qualitative. The time saving is real but unmeasured — Q-15.
  E'- Removed the manual transcription step between handwritten feedback and analysis.\n- Standardised the output, so records have the same shape regardless of who or what produced them.\n- Made the feedback queryable, so themes and sentiment can be reviewed rather than read card by card.',

  'completed',
  'ai_automation',
  'draft',            -- Q-06
  'case_study_only',
  true,
  20,
  false,              -- Q-06
  'Employer-owned system. Q-06: confirm whether it may be published at all, and whether the client/brand may be named. If naming is refused, the anonymised framing ("a multi-outlet restaurant group") is the fallback. Written permission strongly advised (R-02).'
)
on conflict (id) do nothing;

-- 28.3 — the pipeline as structured data, not prose (TD-10). This is what
-- makes the case study prove competence rather than assert it.
insert into public.project_pipeline_steps (id, project_id, step_number, label, description, tech_note, icon_key) values
  ('00000000-0000-4000-a400-000000000001', '00000000-0000-4000-a300-000000000002', 1, 'Scanned handwritten feedback', 'Physical feedback cards captured as scans.',                       null,                'scan'),
  ('00000000-0000-4000-a400-000000000002', '00000000-0000-4000-a300-000000000002', 2, 'OCR',                          'Text extraction from the scanned images.',                         'OCR',               'text'),
  ('00000000-0000-4000-a400-000000000003', '00000000-0000-4000-a300-000000000002', 3, 'Structuring',                  'Interpretation of the extracted text into a consistent shape.',    'Gemini 2.5 Flash',  'sparkles'),
  ('00000000-0000-4000-a400-000000000004', '00000000-0000-4000-a300-000000000002', 4, 'Sentiment processing',         'Sentiment and theme classification.',                              'NLP',               'gauge'),
  ('00000000-0000-4000-a400-000000000005', '00000000-0000-4000-a300-000000000002', 5, 'Information extraction',       'Fields pulled into a consistent record shape.',                     null,                'braces'),
  ('00000000-0000-4000-a400-000000000006', '00000000-0000-4000-a300-000000000002', 6, 'Validation',                   'Rule checks before data is accepted.',                             null,                'check'),
  ('00000000-0000-4000-a400-000000000007', '00000000-0000-4000-a300-000000000002', 7, 'De-duplication',               'Repeat submissions collapsed.',                                    null,                'layers'),
  ('00000000-0000-4000-a400-000000000008', '00000000-0000-4000-a300-000000000002', 8, 'Structured output',            'Written to the operational sheet.',                                'Google Sheets',     'sheet'),
  ('00000000-0000-4000-a400-000000000009', '00000000-0000-4000-a300-000000000002', 9, 'Business intelligence',        'Reporting and trend review on the collected data.',                 null,                'chart')
on conflict (id) do nothing;

insert into public.project_technologies (project_id, technology_id, tech_role, sort_order) values
  ('00000000-0000-4000-a300-000000000002', '00000000-0000-4000-b000-000000000006', 'primary',    10),  -- OCR
  ('00000000-0000-4000-a300-000000000002', '00000000-0000-4000-b000-000000000005', 'primary',    20),  -- Gemini 2.5 Flash
  ('00000000-0000-4000-a300-000000000002', '00000000-0000-4000-b000-000000000007', 'primary',    30),  -- Google Sheets
  ('00000000-0000-4000-a300-000000000002', '00000000-0000-4000-b000-000000000004', 'supporting', 40)   -- Google Apps Script
on conflict (project_id, technology_id) do nothing;


-- -------------------------------------------------------------------------
-- 3. Performix (previously "Exam Build Platform")
--
-- This record carried in_progress and in-progress-only copy from creation.
-- Both facts have since been resolved BY THE OWNER, not inferred:
--
--   2026-08-18  Q-06/Q-07/Q-16 resolved — publication approved, the client
--               may be named, and the live case study was rewritten to the
--               completed scope (see the record in production).
--   2026-08-29  Owner: the platform is COMPLETED, is named "Performix", and
--               is live at https://bookends-exam.onrender.com.
--
-- The slug stays `exam-build-platform`: it is baked into prerendered routes,
-- the sitemap and any shared links, and a rename would 404 all of them.
--
-- The copy below is the seed's short-form scope statement with the
-- in-progress qualifiers removed — nothing was added to it. The full
-- owner-approved case study lives in the production record and is managed
-- through /admin, not this file.
-- -------------------------------------------------------------------------
insert into public.projects (
  id, slug, title, summary,
  description_md, problem_md, solution_md,
  status, category, publication_state, visibility_mode, live_url,
  is_featured, sort_order, client_disclosed, confidentiality_note
) values (
  '00000000-0000-4000-a300-000000000003',
  'exam-build-platform',
  'Performix',
  'A platform for building and running exams, covering candidates, exams and evaluation.',

  'A platform for creating and running exams end to end.',

  'Running exams across users, candidates and evaluation involves several separate manual processes that do not share data with each other.',

  E'The platform is built around five areas:\n\n- User management\n- Exam management\n- Candidate management\n- Automated evaluation\n- A scalable architecture underneath all of it',

  'completed',        -- Owner-confirmed 2026-08-29.
  'web_application',
  'draft',            -- The seed NEVER publishes (AC-CONTENT gate); publishing
                      -- is an owner action taken in /admin, as it was in prod.
  'full',             -- The live URL is meant to be advertised.
  'https://bookends-exam.onrender.com',
  true,               -- featured. This was `false` originally, on the reasoning
                      -- that an in-progress project should not be one of the
                      -- homepage proof points. Reversed by owner decision once
                      -- the project was published — and moot since 2026-08-29,
                      -- when the owner confirmed the project completed.
  30,
  false,              -- The seed stays conservative (FR-PROJ-16 gate). In
                      -- production the owner disclosed the client on
                      -- 2026-08-18; that is an owner action, not a seed default.
  'Q-06/Q-07/Q-16 resolved 2026-08-18; completion and the Performix name confirmed by the owner 2026-08-29.'
)
on conflict (id) do nothing;

insert into public.project_technologies (project_id, technology_id, tech_role, sort_order) values
  ('00000000-0000-4000-a300-000000000003', '00000000-0000-4000-b000-000000000001', 'primary',    10),  -- Node.js
  ('00000000-0000-4000-a300-000000000003', '00000000-0000-4000-b000-000000000002', 'primary',    20),  -- SQL
  ('00000000-0000-4000-a300-000000000003', '00000000-0000-4000-b000-000000000003', 'supporting', 30)   -- Git
on conflict (project_id, technology_id) do nothing;
