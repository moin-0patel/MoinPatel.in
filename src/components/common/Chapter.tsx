import type { ReactNode } from 'react'

import { Section } from '@/components/common/Section'
import { chapterNumber, type ChapterId } from '@/lib/chapters'
import { cn } from '@/lib/cn'

/**
 * Chapter — the cinematic narrative's unit, spec §2 and §30 Phase 1.
 *
 * A thin wrapper over `Section` rather than a replacement for it. Section
 * already owns the three global homepage rules (anchor id, `aria-labelledby`
 * with a visible h2, and a per-section error boundary so one failure cannot
 * blank the page). Reimplementing that here would mean two shells drifting
 * apart, so this adds exactly two things on top:
 *
 *   1. the chapter number, which the design uses as a compositional element
 *   2. `data-chapter`, a stable hook for Phase 4's ScrollTrigger
 *
 * `data-chapter` exists now, in Phase 1, on purpose. Adding it later would mean
 * touching all seven sections again at the point where the animation work is
 * already the risky part; establishing the contract while the markup is static
 * keeps that phase to animation only.
 *
 * The number is decorative and `aria-hidden`: it repeats position the document
 * outline already conveys, and reading "zero three" before every heading is
 * noise for anyone using a screen reader.
 */

export function Chapter({
  id,
  labelledBy,
  className,
  children,
}: {
  id: ChapterId
  labelledBy: string
  className?: string
  children: ReactNode
}) {
  return (
    <div data-chapter={id} className="relative">
      <Section id={id} labelledBy={labelledBy} className={cn('min-h-[60vh]', className)}>
        {children}
      </Section>
    </div>
  )
}

/**
 * The chapter number as a display element — spec §10 asks for large numerals
 * beside project content, and the same treatment marks each chapter.
 */
export function ChapterNumber({ id, className }: { id: ChapterId; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        // Full-strength --color-muted (6.66:1 on base). An opacity modifier here
        // measured 2.54:1 — dimming an already-muted token is how a decorative
        // number becomes an axe failure.
        'text-muted font-mono text-xs tracking-(--tracking-mono) tabular-nums',
        className,
      )}
    >
      {chapterNumber(id)}
    </span>
  )
}
