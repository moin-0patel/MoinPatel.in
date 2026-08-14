import { PagePlaceholder } from '@/components/common/PagePlaceholder'

/**
 * Home — the eleven composite sections specified in PRD Section 12.
 *
 * Phase 8 builds them. Each becomes a `sections/` component wrapped in its own
 * error boundary, fetching through its own hook, so a failure in one renders
 * that section's error state and never blanks the page.
 */
export default function HomePage() {
  return (
    <PagePlaceholder
      title="Moin Patel — AI Developer & AI Automation Executive"
      heading="Moin Patel"
      phase="Phase 8"
      description="Building AI-powered systems that automate work, save time, and reduce business costs."
    />
  )
}
