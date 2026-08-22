import type { ProjectCategory } from '@/types/domain'

/**
 * Human labels for domain enums.
 *
 * Its own module rather than a constant exported from a component: React Fast
 * Refresh only works when a file exports components alone, so a shared map
 * living in `ProjectCard.tsx` breaks hot updates for everything importing it.
 * The same reasoning already moved `CHAPTERS` out of `Chapter.tsx` in Phase 1.
 *
 * One map, so the card and the plate cannot drift into describing the same
 * category two different ways.
 */
export const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  ai_automation: 'AI Automation',
  web_application: 'Web Application',
  business_process_automation: 'Business Process Automation',
  data_reporting: 'Data & Reporting',
  other: 'Other',
}
