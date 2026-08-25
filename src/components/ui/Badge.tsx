import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import type { ProjectStatus, PublicationState } from '@/types/domain'

/**
 * Badge / StatusBadge — PRD 32.4, A11Y-09, FR-PROJ-08.
 *
 * The rule that shapes this component: status is NEVER conveyed by colour
 * alone. Every badge renders real text, so "In Progress" is legible to a
 * colour-blind visitor, in a screenshot, and to a screen reader — and
 * FR-PROJ-08's requirement that In Progress be "visually AND textually
 * distinct" from Completed holds by construction.
 */

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'outline'

/*
 * BORDERS AT 45%, NOT 30% — measured, not nudged.
 *
 * On the old near-black ground a 30% tint of a bright status colour was a clear
 * edge. On cream it is not: `accent/30` composites to rgb(144,197,190), which
 * is 1.14:1 against the card it sits on. The badge had a border in the CSS and
 * no visible edge on the screen, so every tone read as a floating tint.
 *
 * 45% of a status colour that is now genuinely dark (see the token file — both
 * danger and warning were re-solved) lands the edge where it can be seen
 * without turning the badge into an outlined chip.
 *
 * The text ratios, composited on each tone's own fill over the tightest card
 * surface: neutral 7.53, success 4.68, warning 4.81, danger 4.81, accent 5.00,
 * outline 5.10. All clear 4.5.
 */
const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-raised text-secondary border-subtle',
  success: 'bg-success-soft text-success border-success/45',
  warning: 'bg-warning-soft text-warning border-warning/45',
  danger: 'bg-danger-soft text-danger border-danger/45',
  accent: 'bg-accent-soft text-accent border-accent/45',
  outline: 'bg-transparent text-muted border-strong',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[--radius-sm] border',
        'px-2 py-0.5 font-mono text-xs tracking-[--tracking-mono] whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** FR-PROJ-08 / AC-PROJ-14 — how finished the work is. */
const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: BadgeTone }> = {
  completed: { label: 'Completed', tone: 'success' },
  in_progress: { label: 'In Progress', tone: 'warning' },
  planned: { label: 'Planned', tone: 'outline' },
  maintained: { label: 'Maintained', tone: 'accent' },
  archived: { label: 'Archived', tone: 'outline' },
}

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const { label, tone } = PROJECT_STATUS[status]
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  )
}

/** Admin-side: whether the record is live. A different axis entirely (TD-05). */
const PUBLICATION_STATE: Record<PublicationState, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  published: { label: 'Published', tone: 'success' },
  archived: { label: 'Archived', tone: 'outline' },
}

export function PublicationBadge({
  state,
  className,
}: {
  state: PublicationState
  className?: string
}) {
  const { label, tone } = PUBLICATION_STATE[state]
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  )
}
