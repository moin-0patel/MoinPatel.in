import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Chip — PRD 32.4.
 *
 * The technology/skill token: mono label, 28px, accent-soft fill for core
 * skills and a plain border otherwise.
 *
 * `emphasis` is the ONLY emphasis mechanism available, by design. FR-SKILL-03
 * forbids percentages, bars and star ratings, and there is no proficiency
 * column to render one from even if a component wanted to.
 */
export function Chip({
  emphasis = 'default',
  className,
  children,
}: {
  emphasis?: 'default' | 'core'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-[--radius-sm] px-2.5',
        'font-mono text-xs tracking-[--tracking-mono] whitespace-nowrap',
        emphasis === 'core'
          ? 'bg-accent-soft text-accent border border-accent/25'
          : 'border-subtle text-secondary border bg-transparent',
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * RES-05 — a horizontally scrolling chip row with no visible scrollbar. Tech
 * chips must never wrap into four lines on a card; they scroll instead.
 *
 * `tabIndex={0}` and the group label are required, not decorative. A region
 * that scrolls with a mouse or a finger but cannot be reached by keyboard
 * strands keyboard-only users with content they can see and never read — axe
 * flags it `scrollable-region-focusable` (serious), and it is a real WCAG
 * 2.1.1 failure. Making it focusable lets the arrow keys scroll it; the label
 * stops it announcing as an unnamed focus stop with no explanation.
 */
export function ChipRow({
  className,
  children,
  label = 'Technologies',
}: {
  className?: string
  children: ReactNode
  /** Accessible name; override when the row holds something other than tech. */
  label?: string
}) {
  return (
    <div
      className={cn('scroll-row flex items-center gap-1.5', className)}
      tabIndex={0}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  )
}
