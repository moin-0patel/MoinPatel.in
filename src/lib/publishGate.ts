import type { ProjectCategory, ProjectStatus, VisibilityMode } from '@/types/domain'

/**
 * Publish gate — PRD FR-ADM-11 (P0).
 *
 * "A project cannot be set to `published` unless title, slug, summary,
 * category, status and at least one of the case-study fields are populated,
 * every attached image has alt text, and the visibility mode's required URL is
 * present."
 *
 * Pure and separate from the form so it can be unit-tested and so the same
 * answer drives three different surfaces: whether the Published option is
 * selectable, what the blocker list says, and whether Save is allowed through.
 * Three re-implementations of "is this ready?" would disagree within a week.
 *
 * This is the FRIENDLY half of the gate. The database also enforces what it
 * can express — `projects_publish_gate`, `projects_cover_alt_check`,
 * `projects_github_only_requires_url` — and that half is what actually holds
 * against a crafted API call. This one exists to say *which field* is missing
 * instead of returning a constraint violation.
 */

export type PublishGateInput = {
  title: string
  slug: string
  summary: string
  category: ProjectCategory | ''
  status: ProjectStatus | ''
  descriptionMd: string
  problemMd: string
  solutionMd: string
  howItWorksMd: string
  businessImpactMd: string
  visibilityMode: VisibilityMode
  githubUrl: string
  liveUrl: string
  /** Every attached image, so alt text can be checked (MED-03). */
  images: { altText: string }[]
  coverImagePath: string
  coverImageAlt: string
}

export type PublishBlocker = {
  /** Which form section to send the user to. */
  section: 'basics' | 'case-study' | 'media' | 'links'
  message: string
}

const isBlank = (value: string | null | undefined) => !value || value.trim() === ''

/**
 * Returns everything standing between this project and `published`.
 *
 * An empty array means it is publishable. The list is ordered by section so
 * the messages read top-to-bottom in the same order as the form.
 */
export function getPublishBlockers(project: PublishGateInput): PublishBlocker[] {
  const blockers: PublishBlocker[] = []

  // --- Basics --------------------------------------------------------------
  if (isBlank(project.title)) {
    blockers.push({ section: 'basics', message: 'Add a title.' })
  }
  if (isBlank(project.slug)) {
    blockers.push({ section: 'basics', message: 'Add a slug.' })
  }
  if (isBlank(project.summary)) {
    blockers.push({
      section: 'basics',
      message: 'Add a short description — it is used on cards and as the meta description.',
    })
  }
  if (isBlank(project.category)) {
    blockers.push({ section: 'basics', message: 'Choose a category.' })
  }
  if (isBlank(project.status)) {
    blockers.push({ section: 'basics', message: 'Choose a status.' })
  }

  // --- Case study ----------------------------------------------------------
  // "At least one of the case-study fields." A published project that is only
  // a title and a summary is a card pretending to be a case study, which is
  // exactly what G-02 exists to prevent.
  const hasCaseStudyContent = [
    project.descriptionMd,
    project.problemMd,
    project.solutionMd,
    project.howItWorksMd,
    project.businessImpactMd,
  ].some((field) => !isBlank(field))

  if (!hasCaseStudyContent) {
    blockers.push({
      section: 'case-study',
      message:
        'Write at least one case-study section — overview, problem, solution, how it works, or business impact.',
    })
  }

  // --- Media ---------------------------------------------------------------
  // A11Y-06 / MED-03: alt text is required BEFORE publish, not "eventually".
  if (!isBlank(project.coverImagePath) && isBlank(project.coverImageAlt)) {
    blockers.push({ section: 'media', message: 'Add alt text for the cover image.' })
  }

  const imagesMissingAlt = project.images.filter((image) => isBlank(image.altText)).length
  if (imagesMissingAlt > 0) {
    blockers.push({
      section: 'media',
      message: `Add alt text for ${imagesMissingAlt} image${imagesMissingAlt === 1 ? '' : 's'}.`,
    })
  }

  // --- Links ---------------------------------------------------------------
  // These two modes make the card link directly to an external destination.
  // Without the URL the card links nowhere.
  if (project.visibilityMode === 'github_only' && isBlank(project.githubUrl)) {
    blockers.push({
      section: 'links',
      message: 'Visibility is set to GitHub only, so a GitHub URL is required.',
    })
  }
  if (project.visibilityMode === 'live_demo_only' && isBlank(project.liveUrl)) {
    blockers.push({
      section: 'links',
      message: 'Visibility is set to Live demo only, so a live URL is required.',
    })
  }

  return blockers
}

export function canPublish(project: PublishGateInput): boolean {
  return getPublishBlockers(project).length === 0
}

/**
 * FR-PROJ-16 — a separate, softer check.
 *
 * NOT a publish blocker: publishing a project with the client undisclosed is
 * legitimate and is in fact the safe default. This surfaces the reminder that
 * the copy and the screenshots must not name the employer either, because a
 * boolean column cannot redact prose.
 *
 * R-02 rates unauthorised disclosure of employer-owned detail as severe, and
 * it is the one mistake in this product that cannot be undone by editing a row.
 */
export function getConfidentialityReminder(project: {
  clientDisclosed: boolean
  clientName: string
  publicationState: string
}): string | null {
  if (project.publicationState !== 'published') return null
  if (project.clientDisclosed) return null

  return (
    'This project is published with the client undisclosed. Check that no case-study text, ' +
    'image or caption names the employer — the flag hides the client field, not your prose.'
  )
}
