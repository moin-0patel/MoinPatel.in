import type { ReactNode } from 'react'

import type { ChapterId } from '@/lib/chapters'

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
  chapter,
  children,
}: {
  id: string
  labelledBy: string
  className?: string
  /**
   * Marks this section as one of the seven narrative chapters — motion spec
   * section 10.
   *
   * Optional because Section is also used for the homepage blocks that sit
   * outside the narrative (Impact, Experience, Skills, Education) and for
   * sections on other routes, none of which the timeline drives.
   *
   * It exists as a prop rather than a Chapter wrapper for the four chapters
   * that predate Phase 1. Wrapping them would add the chapter number and change
   * their visual treatment, which is a redesign nobody asked for; all the
   * timeline actually needs is the hook.
   */
  chapter?: ChapterId
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-chapter={chapter}
      /*
       * Vertical rhythm measured from the reference: its sections carry 144-216px
       * of top padding and run 1000-3600px tall. Ours were a uniform 96px, and
       * the whole document came to 9,662px against the reference's 13,863px —
       * the page read as compressed rather than spacious.
       */
      className={cn('scroll-mt-24 py-16 md:py-24 lg:py-36', className)}
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
  scale = 'default',
  tone = 'default',
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
  /**
   * Heading scale. `default` is the shared 68px/500 every section uses.
   *
   * `display` is the reference's one oversized heading — measured at 180px on
   * its "What You Get?" section, roughly 2.7x the others. It exists as a prop
   * rather than a second component because everything else about the heading —
   * eyebrow, rule, meta, description — is identical, and forking the component
   * to change one font size is how two components drift apart.
   */
  scale?: 'default' | 'display'
  /**
   * Which ground this heading sits on.
   *
   * Added for the Work section, which the reference inverts to a near-black
   * plate between two cream ones (measured median luminance 206 / 19 / 198
   * across About, Work and Overview). Its heading is white at the same
   * 65.95px/500 as every other, so the only thing that differs is ink.
   *
   * A prop rather than a second component, and additive rather than a change:
   * `default` behaves exactly as before, so no existing caller moves. Forking
   * SectionHeading to swap three colours is how two headings drift apart.
   */
  tone?: 'default' | 'inverse'
  className?: string
}) {
  const inverse = tone === 'inverse'

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
          className={cn(
            'mb-3 flex items-center gap-2.5 font-mono text-xs tracking-(--tracking-mono) uppercase',
            inverse ? 'text-[color:var(--color-accent-fill)]' : 'text-accent',
          )}
        >
          <span
            className={cn(
              'inline-block h-px w-6 shrink-0',
              inverse ? 'bg-[color:var(--color-accent-fill)]' : 'bg-accent',
            )}
          />
          {eyebrow}
        </p>
      )}

      <div
        className={cn(
          'flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b pb-4',
          inverse ? 'border-white/20' : 'border-subtle',
        )}
      >
        {/* A11Y-02 — every section heading is an h2; levels never skip. */}
        {/*
         * Sized from the reference, not from taste. Measured at 1440 its
         * section headings are 65.95px at weight 500; ours were 38px at weight
         * 600 — a 1.7x gap, and the largest single visual difference below the
         * hero once the palette matched.
         *
         * `--text-5xl` clamps to 48-68px, landing on the measured value at
         * 1440 and scaling down sensibly. Weight drops to 500 to match; the
         * reference's display type is medium, not semibold, which is part of
         * why it reads as editorial rather than as a product page.
         */}
        <h2
          id={id}
          className={cn(
            'font-display leading-[1.05] font-medium text-balance',
            inverse ? 'text-[color:var(--work-ink,#fff)]' : 'text-primary',
            scale === 'display'
              ? // Steps to --text-7xl (up to 120px). The reference runs 180px
                // here, but it sets two short words; "Where that shows up" is
                // four, and at 180px it wrapped to three lines and pushed the
                // capability grid off the first screen at 1024. This is the
                // largest step that holds the composition.
                'text-[length:var(--text-4xl)] md:text-[length:var(--text-5xl)] lg:text-[length:var(--text-7xl)]'
              : 'text-[length:var(--text-3xl)] md:text-[length:var(--text-4xl)] lg:text-[length:var(--text-5xl)]',
          )}
        >
          {/*
           * The slide target for the masked reveal — see ScrollChoreography.
           *
           * The reference's headings do not fade in; they ride up from below
           * their own baseline inside a clipping parent, at full opacity. That
           * needs an inner element to move independently of the clip, which is
           * this span. `block` so it takes the h2's full width and cannot
           * introduce an inline-layout difference; with no tween running it is
           * visually identical to the bare text it replaced.
           */}
          <span data-reveal-mask="" className="block">
            {title}
          </span>
        </h2>
        {meta && (
          <p
            aria-hidden="true"
            /*
             * `text-secondary`, not `text-muted` — a contrast fix, not an
             * emphasis change. This label is the smallest text in a heading and
             * sits at the right edge, which is where the Core glow and the
             * hairline rules land. On --color-muted over --color-subtle
             * (#464555) it measured 4.02:1 against a 4.5:1 requirement. One
             * step up clears it while staying visually subordinate: still mono,
             * still 12px, still quieter than the title beside it.
             */
            className={cn(
              'font-mono text-xs tracking-(--tracking-mono) uppercase',
              inverse ? 'text-white/70' : 'text-secondary',
            )}
          >
            {meta}
          </p>
        )}
      </div>

      {description && (
        <p className={cn('measure mt-4', inverse ? 'text-white/80' : 'text-secondary')}>
          {description}
        </p>
      )}
    </div>
  )
}
