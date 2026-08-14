-- =========================================================================
-- 04_skill_categories_skills — PRD 16, 28.2
--
-- Exactly the three categories and their skills from Section 16. Nothing
-- added: Q-05 covers whether React, TypeScript, Supabase/PostgreSQL, Google
-- Apps Script and Gemini API should also appear here.
--
-- There is no proficiency value anywhere below, because the column does not
-- exist (FR-SKILL-03, 23.11). `is_core` and ordering are the only emphasis.
-- =========================================================================

insert into public.skill_categories (id, name, slug, sort_order, published) values
  ('00000000-0000-4000-c000-000000000001', 'Programming & Development', 'programming-development', 10, true),
  ('00000000-0000-4000-c000-000000000002', 'AI & Automation',           'ai-automation',           20, true),
  ('00000000-0000-4000-c000-000000000003', 'Business Tools',            'business-tools',          30, true)
on conflict (id) do nothing;

insert into public.skills (id, category_id, name, slug, is_core, sort_order, published) values
  -- Programming & Development
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', 'Node.js',                         'nodejs',                      true,  10, true),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000001', 'SQL',                             'sql',                         true,  20, true),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000001', 'Git',                             'git',                         false, 30, true),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-c000-000000000001', 'Web Application Development',     'web-application-development', true,  40, true),

  -- AI & Automation
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-c000-000000000002', 'AI Automation',                   'ai-automation',               true,  10, true),
  ('00000000-0000-4000-d000-000000000006', '00000000-0000-4000-c000-000000000002', 'Workflow Automation',             'workflow-automation',         true,  20, true),
  ('00000000-0000-4000-d000-000000000007', '00000000-0000-4000-c000-000000000002', 'Business Process Automation',     'business-process-automation', true,  30, true),
  ('00000000-0000-4000-d000-000000000008', '00000000-0000-4000-c000-000000000002', 'Operational Digitisation',        'operational-digitisation',    false, 40, true),

  -- Business Tools
  ('00000000-0000-4000-d000-000000000009', '00000000-0000-4000-c000-000000000003', 'Petpooja POS',                    'petpooja-pos',                false, 10, true),
  ('00000000-0000-4000-d000-00000000000a', '00000000-0000-4000-c000-000000000003', 'Google Workspace',                'google-workspace',            false, 20, true),
  ('00000000-0000-4000-d000-00000000000b', '00000000-0000-4000-c000-000000000003', 'Microsoft Excel',                 'microsoft-excel',             false, 30, true),
  ('00000000-0000-4000-d000-00000000000c', '00000000-0000-4000-c000-000000000003', 'Google Business Profile',         'google-business-profile',     false, 40, true),
  ('00000000-0000-4000-d000-00000000000d', '00000000-0000-4000-c000-000000000003', 'Zomato Merchant',                 'zomato-merchant',             false, 50, true),
  ('00000000-0000-4000-d000-00000000000e', '00000000-0000-4000-c000-000000000003', 'Swiggy Merchant',                 'swiggy-merchant',             false, 60, true)
on conflict (id) do nothing;
