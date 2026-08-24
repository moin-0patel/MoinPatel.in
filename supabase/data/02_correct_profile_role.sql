-- =========================================================================
-- Corrective content script — profile role title
--
-- Run in the Supabase SQL editor for project `vlzsrfmfxvuspgqanbrm`.
-- Idempotent: running it twice changes nothing the second time.
--
-- WHY THIS IS SQL AND NOT A CODE CHANGE
--
-- `role_title` is consumed dynamically from `profiles` by the hero, the SEO
-- description, the resume page and the footer. Hardcoding the new string in a
-- component would create a second source of truth for a value the database
-- already owns, which is the exact duplication this project removed when
-- `project-stack.ts` was deleted.
-- =========================================================================

update public.profiles
   set role_title = 'AI Developer & Automation Engineer'
 where role_title = 'AI Automation Executive';

-- Verify — should return the new title and nothing else.
select id, full_name, role_title
  from public.profiles;
