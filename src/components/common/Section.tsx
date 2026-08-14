import type { ReactNode } from 'react'

import { RouteErrorBoundary } from '@/app/RouteErrorBoundary'
import { ErrorState } from '@/components/common/States'
import { cn } from '@/lib/cn'

/**
 * Section shell — PRD Section 12, "Global homepage rules".
 *
 * Three rules, applied here once instead of eleven times:
 *
 *   - each section is `<section aria-labelledby>` with a visible <h2>, and is
 *     individually addressable by anchor id
 *   - each is wrapped in its own error boundary, so a failure renders that
 *     section's error state and never blanks the page
 *   - vertical rhythm follows 32.3 (96–128px desktop, 64–80 tablet, 48–64 mobile)
 */
export function Section({
  id,
  labelledBy,
  className,
  children,
}: {
  id: string
  labelledBy: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn('scroll-mt-24 py-12 md:py-16 lg:py-24', className)}
    >
      <div className="container-page">
        <RouteErrorBoundary
          context={`section:${id}`}
          fallback={(_error, reset) => (
            <ErrorState
              title="Couldn't load this section"
              description="The rest of the page is unaffected."
              onRetry={reset}
            />
          )}
        >
          {children}
        </RouteErrorBoundary>
      </div>
    </section>
  )
}

/**
 * SectionHeading — PRD 30.2.
 *
 * The eyebrow is `aria-hidden`: it is a visual label ("01 · Selected work")
 * that repeats information the heading already carries, and announcing it
 * would make every section start with noise.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  className,
}: {
  id: string
  eyebrow?: string
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('mb-8 md:mb-12', className)}>
      {eyebrow && (
        <p
          aria-hidden="true"
          className="text-accent mb-3 font-mono text-xs tracking-[--tracking-mono] uppercase"
        >
          {eyebrow}
        </p>
      )}
      {/* A11Y-02 — every section heading is an h2; levels never skip. */}
      <h2 id={id} className="text-primary">
        {title}
      </h2>
      {description && <p className="text-secondary measure mt-4">{description}</p>}
    </div>
  )
}
