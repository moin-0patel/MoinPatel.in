import type { ProjectCategory } from '@/types/domain'

/**
 * "What I Build" — PRD 12.4, TD-12.
 *
 * Static constants, not database rows. These are positioning statements that
 * change rarely; putting them in the CMS would add admin surface for no
 * benefit. If editing becomes frequent, they move to `site_settings` (P3).
 *
 * `category` must match the `project_category` enum so the link filters
 * correctly — the type annotation is what enforces that.
 */

export type BuildType = {
  title: string
  description: string
  bullets: readonly [string, string, string]
  category: ProjectCategory
}

export const BUILD_TYPES: readonly BuildType[] = [
  {
    title: 'AI Automation Systems',
    description:
      'Pipelines that read, interpret and structure information that used to be handled by a person.',
    bullets: [
      'Document and text extraction',
      'Classification and sentiment processing',
      'Validation and de-duplication before data is trusted',
    ],
    category: 'ai_automation',
  },
  {
    title: 'Internal Web Applications',
    description:
      'Tools built for the people who actually do the work, replacing spreadsheets that have outgrown themselves.',
    bullets: [
      'Single source of truth instead of scattered files',
      'Calculations that stay current on their own',
      'Built around the existing process, not against it',
    ],
    category: 'web_application',
  },
  {
    title: 'Business Process Automation',
    description:
      'Removing the repetitive steps between something happening and someone being able to act on it.',
    bullets: [
      'Manual hand-offs replaced with defined workflows',
      'Fewer places for a task to stall',
      'Consistent output regardless of who is on shift',
    ],
    category: 'business_process_automation',
  },
  {
    title: 'Operational Reporting & Data Tools',
    description:
      'Turning operational records into something a manager can actually read and decide from.',
    bullets: [
      'Data collected once and reused',
      'Reporting that does not need rebuilding each month',
      'Trends visible without reading every row',
    ],
    category: 'data_reporting',
  },
] as const
