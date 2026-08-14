-- =========================================================================
-- 03_technologies — PRD 28.2
--
-- Seeded from what the described projects ACTUALLY use. Not an aspirational
-- stack list — Principle 1: evidence over adjectives.
--
-- Frontend technologies (React, TypeScript, Supabase/PostgreSQL) are absent on
-- purpose. Q-05 asks whether they should appear; they are implied by the
-- projects but are not in the skills list Moin supplied, and this seed does
-- not add them unsupported. Add them in a follow-up seed once Q-05 is answered.
-- =========================================================================

insert into public.technologies (id, name, slug, category, icon_key, sort_order) values
  ('00000000-0000-4000-b000-000000000001', 'Node.js',                'nodejs',                  'language',        'nodejs',     10),
  ('00000000-0000-4000-b000-000000000002', 'SQL',                    'sql',                     'language',        'database',   20),
  ('00000000-0000-4000-b000-000000000003', 'Git',                    'git',                     'devops',          'git',        30),
  ('00000000-0000-4000-b000-000000000004', 'Google Apps Script',     'google-apps-script',      'automation_tool', 'script',     40),
  ('00000000-0000-4000-b000-000000000005', 'Gemini 2.5 Flash',       'gemini-2-5-flash',        'ai_service',      'sparkles',   50),
  ('00000000-0000-4000-b000-000000000006', 'OCR',                    'ocr',                     'ai_service',      'scan',       60),
  ('00000000-0000-4000-b000-000000000007', 'Google Sheets',          'google-sheets',           'business_tool',   'sheet',      70),
  ('00000000-0000-4000-b000-000000000008', 'Petpooja POS',           'petpooja-pos',            'business_tool',   'pos',        80),
  ('00000000-0000-4000-b000-000000000009', 'Google Workspace',       'google-workspace',        'business_tool',   'workspace',  90),
  ('00000000-0000-4000-b000-00000000000a', 'Microsoft Excel',        'microsoft-excel',         'business_tool',   'sheet',     100),
  ('00000000-0000-4000-b000-00000000000b', 'Google Business Profile','google-business-profile', 'business_tool',   'store',     110),
  ('00000000-0000-4000-b000-00000000000c', 'Zomato Merchant',        'zomato-merchant',         'business_tool',   'store',     120),
  ('00000000-0000-4000-b000-00000000000d', 'Swiggy Merchant',        'swiggy-merchant',         'business_tool',   'store',     130)
on conflict (id) do nothing;
