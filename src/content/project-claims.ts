/**
 * Case-study claim band — the design's "Impact Metrics" strip.
 *
 * WHY THESE ARE NOT NUMBERS
 *
 * The design mocks this band up as three big figures: 98% classification
 * accuracy, <0.5s processing latency, 0 human intervention. None of those are
 * real. No metric of that kind has been measured for any of these projects,
 * the resume deliberately claims none, and the case studies were written the
 * same way on purpose. Rendering invented percentages on a portfolio is the
 * exact failure PRD Principle 4 exists to prevent.
 *
 * So the band keeps its shape and drops the arithmetic. Every claim below is a
 * structural fact taken from the case study for that project, which in turn was
 * written from the project's own source. Each one is checkable by reading the
 * repository — that is the bar for appearing here.
 *
 * Static rather than CMS-backed, following build-types.ts and impact.ts: these
 * restate an architecture rather than being editorial copy, and they change
 * only when the system does. If they ever need editing without a deploy they
 * belong in a `project_claims` table, which is a schema change.
 *
 * A project with no entry renders no band. Silence is correct when there is
 * nothing verifiable to say.
 */

export type ProjectClaim = {
  /** Short mono label — the design sets these uppercase. */
  label: string
  /** One line saying what the label actually means. */
  detail: string
}

export const PROJECT_CLAIMS: Record<string, ProjectClaim[]> = {
  'ai-feedback-automation': [
    { label: 'Zero servers', detail: 'Apps Script and Sheets; nothing to host or maintain' },
    { label: 'Self-monitoring', detail: 'Health check and weekly digest report on the pipeline' },
    { label: 'Idempotent', detail: 'Entry identifiers make a re-run safe, never double-counted' },
  ],
  'recipe-costing-restaurant-operations-system': [
    { label: 'Cost cascade', detail: 'A price change recomputes every dependent recipe' },
    { label: 'Approval gated', detail: 'Editing an approved recipe returns it to draft' },
    { label: 'Brand scoped', detail: 'Access limited to the brands and outlets a person owns' },
  ],
  'exam-build-platform': [
    { label: 'Answer level', detail: 'Every response stored individually, not just a total' },
    { label: 'Topic + difficulty', detail: 'Each question tagged, so gaps are locatable' },
    { label: 'Multi-outlet', detail: 'Permissions scoped by outlet and department' },
  ],
}
