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
  meta,
  className,
}: {
  id: string
  eyebrow?: string
  title: string
  description?: string
  /**
   * Optional right-aligned mono label — the design pairs a section title with a
   * small status word on the same rule ("Core Architecture … MODULES_LOADED").
   * Decorative, so it is hidden from assistive tech like the eyebrow.
   */
  meta?: string
  className?: string
}) {
  return (
    // flex-1/min-w-0: several sections place this in a flex row beside a
    // link, where a content-sized block would cut the divider short.
    <div className={cn('mb-8 min-w-0 flex-1 md:mb-12', className)}>
      {/*
       * The design leads each section with a mono uppercase label preceded by a
       * short accent rule, then sets the title over a hairline divider.
       */}
      {eyebrow && (
        <p
          aria-hidden="true"
          className="text-accent mb-3 flex items-center gap-2.5 font-mono text-xs tracking-[--tracking-mono] uppercase"
        >
          <span className="bg-accent inline-block h-px w-6 shrink-0" />
          {eyebrow}
        </p>
      )}

      <div className="border-subtle flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b pb-4">
        {/* A11Y-02 — every section heading is an h2; levels never skip. */}
        <h2 id={id} className="text-primary text-2xl md:text-3xl">
          {title}
        </h2>
        {meta && (
          <p
            aria-hidden="true"
            className="text-muted font-mono text-xs tracking-[--tracking-mono] uppercase"
          >
            {meta}
          </p>
        )}
      </div>

      {description && <p className="text-secondary measure mt-4">{description}</p>}
    </div>
  )
}
