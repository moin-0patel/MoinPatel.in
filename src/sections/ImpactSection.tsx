import {
  BarChart3,
  CheckCircle2,
  Clock,
  Hand,
  TrendingDown,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import { Section, SectionHeading } from '@/components/common/Section'
import { IMPACT_OUTCOMES } from '@/content/impact'

/**
 * Impact / Business Value — PRD 12.5.
 *
 * ⚠ FR-HOME-05a (P0): this section must never display a numeric metric — no
 * percentage, no currency figure, no hours saved — unless the value is stored
 * in the database, approved by Moin, and attributable to a measured project
 * outcome.
 *
 * Two design choices enforce that rather than merely asking for it:
 *
 *   1. The copy lives in `content/impact.ts`, which has no numbers in it and a
 *      header explaining why.
 *   2. This renders as icon + statement ROWS, not "stat counters". A big
 *      number in a box is a shape that invites someone to invent a number to
 *      fill it. R-06 rates that as the easiest mistake on this project to
 *      make, and severe when made.
 */

const ICONS: Record<string, LucideIcon> = {
  hand: Hand,
  clock: Clock,
  'trending-down': TrendingDown,
  check: CheckCircle2,
  workflow: Workflow,
  chart: BarChart3,
}

export function ImpactSection() {
  return (
    <Section id="impact" labelledBy="impact-heading" className="bg-surface/30">
      <SectionHeading
        id="impact-heading"
        eyebrow="Built for real problems"
        meta="EVIDENCE"
        title="What these systems are for"
        description="The reference site proves itself with client testimonials. There are none to show here, so this shows the problems the work actually addresses instead of borrowing credibility that has not been earned yet."
      />

      <ul className="grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
        {IMPACT_OUTCOMES.map((outcome) => {
          const Icon = ICONS[outcome.iconKey] ?? CheckCircle2
          return (
            <li key={outcome.statement} className="flex gap-3">
              {/* A11Y — icons are decorative; the text carries all meaning. */}
              <span className="bg-accent-soft text-accent mt-0.5 grid size-9 shrink-0 place-items-center rounded-[--radius-sm]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-primary font-medium">{outcome.statement}</p>
                <p className="text-secondary mt-1 text-sm">{outcome.supporting}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
