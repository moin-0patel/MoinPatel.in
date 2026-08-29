import { SEO } from '@/components/common/SEO'
import { pageTitle } from '@/lib/seo'

/**
 * Phase 6 scaffolding — PRD 43.3, Phase 6 exit criterion: "Every route
 * resolves with placeholder content."
 *
 * Each route already renders its real landmarks, its single <h1> and its own
 * <SEO> block, so the accessibility and metadata structure is correct before
 * any section is built. The body is replaced phase by phase (8–15); this
 * component is deleted when the last one lands.
 *
 * It is deliberately obvious that it is scaffolding — a placeholder that looks
 * finished is how unfinished pages ship.
 */
export function PagePlaceholder({
  title,
  heading,
  phase,
  description,
  noindex = false,
}: {
  title: string
  heading: string
  /** Which PRD phase replaces this. */
  phase: string
  description?: string
  noindex?: boolean
}) {
  return (
    <>
      <SEO title={pageTitle(title)} description={description} noindex={noindex} />
      <div className="container-page py-20">
        {/* A11Y-02 — exactly one h1 per page. */}
        <h1 className="text-primary">{heading}</h1>
        {description && <p className="text-secondary measure mt-4">{description}</p>}
        <p className="border-subtle text-muted mt-10 inline-block rounded-(--radius-sm) border border-dashed px-3 py-1.5 font-mono text-xs">
          Scaffold · built in {phase}
        </p>
      </div>
    </>
  )
}
