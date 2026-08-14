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
-- 3. Exam Build Platform
--
-- Status is in_progress, and the copy below says so plainly. Principle 3 and
-- rule 9 of 43.4: in-progress means in-progress in EVERY surface. There is no
-- completed-state language in this record.
--
-- how_it_works_md and the pipeline steps are deliberately absent. Q-16 asks
-- what is genuinely built today versus planned; until that is answered, this
-- seed states the intended scope and does not claim any part of it is
-- finished. Writing "user management is built" without confirmation would be
-- exactly the fabrication the PRD prohibits.
-- -------------------------------------------------------------------------
insert into public.projects (
  id, slug, title, summary,
  description_md, problem_md, solution_md,
  status, category, publication_state, visibility_mode,
  is_featured, sort_order, client_disclosed, confidentiality_note
) values (
  '00000000-0000-4000-a300-000000000003',
  'exam-build-platform',
  'Exam Build Platform',
  'In progress — a platform for building and running exams, covering candidates, exams and evaluation.',

  'A platform for creating and running exams end to end. **This project is in progress.** The scope below describes what the platform is being built to do, not what is finished.',

  'Running exams across users, candidates and evaluation involves several separate manual processes that do not share data with each other.',

  E'The platform is being built around five areas:\n\n- User management\n- Exam management\n- Candidate management\n- Automated evaluation\n- A scalable architecture underneath all of it\n\nWhich of these are complete today is being confirmed before this case study is published.',

  'in_progress',
  'web_application',
  'draft',            -- Q-07, Q-16
  'case_study_only',
  false,              -- not featured: an in-progress project should not be one
                      -- of the three proof points on the homepage
  30,
  false,              -- Q-07
  'Q-07: confirm who this is for and whether it may be published. Q-16: confirm what is genuinely built versus planned before any how-it-works content is written. Must render as In Progress everywhere (Principle 3).'
)
on conflict (id) do nothing;

insert into public.project_technologies (project_id, technology_id, tech_role, sort_order) values
  ('00000000-0000-4000-a300-000000000003', '00000000-0000-4000-b000-000000000001', 'primary',    10),  -- Node.js
  ('00000000-0000-4000-a300-000000000003', '00000000-0000-4000-b000-000000000002', 'primary',    20),  -- SQL
  ('00000000-0000-4000-a300-000000000003', '00000000-0000-4000-b000-000000000003', 'supporting', 30)   -- Git
on conflict (project_id, technology_id) do nothing;
