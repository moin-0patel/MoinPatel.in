import type { ProjectSummary, VisibilityMode } from '@/types/domain'

/**
 * Visibility resolution — PRD 13.2, AC-PROJ-11.
 *
 * Given a project's `visibility_mode`, what does its card link to and which
 * icon links render? This is pure, table-driven logic sitting in one module
 * because 41.1 requires it to be tested across all five modes, and because
 * scattering the rules through <ProjectCard> would make "does github_only
 * still bypass the case study?" an archaeology question.
 *
 * Note what this module is NOT: it is not access control. A `private` project
 * is invisible because RLS refuses to return it (25.1), not because this
 * function says so. This decides presentation for rows the database has
 * already agreed to hand over.
 */

export type CardTarget =
  | { kind: 'case-study'; href: string }
  | { kind: 'external'; href: string }
  /** `private` — the row should never have reached the client at all. */
  | { kind: 'none' }

export type CardLinkPolicy = {
  target: CardTarget
  showGithubIcon: boolean
  showLiveIcon: boolean
}

const CASE_STUDY_MODES: ReadonlySet<VisibilityMode> = new Set(['full', 'case_study_only'])

export function caseStudyPath(slug: string): string {
  return `/projects/${slug}`
}

export function resolveCardLinks(
  project: Pick<ProjectSummary, 'slug' | 'visibilityMode' | 'githubUrl' | 'liveUrl'>,
): CardLinkPolicy {
  const { slug, visibilityMode, githubUrl, liveUrl } = project

  switch (visibilityMode) {
    case 'full':
      return {
        target: { kind: 'case-study', href: caseStudyPath(slug) },
        showGithubIcon: githubUrl !== null,
        showLiveIcon: liveUrl !== null,
      }

    case 'case_study_only':
      return {
        target: { kind: 'case-study', href: caseStudyPath(slug) },
        showGithubIcon: false,
        showLiveIcon: false,
      }

    case 'github_only':
      // The card bypasses the case study entirely. The DB constraint
      // `projects_github_only_requires_url` guarantees the URL exists, but a
      // null here must degrade to a dead-end card rather than a link to
      // "undefined".
      return {
        target: githubUrl ? { kind: 'external', href: githubUrl } : { kind: 'none' },
        showGithubIcon: true,
        showLiveIcon: false,
      }

    case 'live_demo_only':
      return {
        target: liveUrl ? { kind: 'external', href: liveUrl } : { kind: 'none' },
        showGithubIcon: false,
        showLiveIcon: true,
      }

    case 'private':
      return { target: { kind: 'none' }, showGithubIcon: false, showLiveIcon: false }
  }
}

/** Does this mode have a case-study page at all? Used by sitemap generation. */
export function hasCaseStudyPage(mode: VisibilityMode): boolean {
  return CASE_STUDY_MODES.has(mode)
}

/**
 * FR-CASE-09 — map a project category to the contact form's service type, so
 * "Discuss a similar system" arrives with the right option preselected.
 *
 * The enums are deliberately different (`project_category` has
 * `data_reporting`, `service_type` does not), which is why this is an explicit
 * map rather than a cast.
 */
export function serviceTypeForCategory(
  category: ProjectSummary['category'],
): 'ai_automation' | 'web_application' | 'business_process_automation' | 'other' {
  switch (category) {
    case 'ai_automation':
      return 'ai_automation'
    case 'web_application':
      return 'web_application'
    case 'business_process_automation':
      return 'business_process_automation'
    case 'data_reporting':
    case 'other':
      return 'other'
  }
}
