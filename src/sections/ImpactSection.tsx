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
import { Card } from '@/components/ui/Card'
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

      {/*
       * THE CREDIBILITY SLOT — the reference's testimonial card, measured live:
       * `.swiper-card` 477 x 427, radius 11.95px, padding 24px, with a bold
       * ~30px/700 pull-line at 70% black, a 16.99px body, a small accent
       * quote-glyph chip top-right, and the person's name, role and company
       * underneath. Eight of them in a drag carousel.
       *
       * WHAT FILLS IT HERE: the outcomes the systems were built for — real,
       * numberless statements from content/impact.ts — in the same card
       * anatomy: the statement takes the pull-line treatment, the supporting
       * line takes the body slot, and the existing outcome icon takes the
       * quote-glyph chip's corner.
       *
       * WHAT IS DELIBERATELY ABSENT: everything that would be social proof —
       * names, roles, companies, photos, quotes. No testimonial records exist,
       * and FR-HOME-05a plus this section's own header ban inventing them. The
       * card reads as a claim about the WORK, not a voice that was never
       * recorded.
       *
       * No carousel either: the reference drags because eight cards overflow
       * its measure. Six fit a grid here. A drag surface with nothing hidden
       * behind it is chrome without a job.
       */}
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {IMPACT_OUTCOMES.map((outcome) => {
          const Icon = ICONS[outcome.iconKey] ?? CheckCircle2
          return (
            <li key={outcome.statement} className="flex min-w-0">
              <Card as="article" className="relative flex h-full flex-col rounded-[12px] p-6">
                {/* A11Y — decorative; the text carries all meaning. */}
                <span
                  aria-hidden="true"
                  className="bg-accent-soft text-accent absolute top-6 right-6 grid size-9 place-items-center rounded-(--radius-sm)"
                >
                  <Icon className="size-4" />
                </span>

                {/*
                 * The reference's pull-line: 29.95px/700 at rgba(0,0,0,0.7).
                 * --text-2xl clamps 24-29px — the same value at 1440.
                 */}
                <p className="text-primary/70 font-display max-w-[calc(100%-3rem)] text-[length:var(--text-2xl)] leading-[1.15] font-bold text-balance">
                  {outcome.statement}
                </p>

                <p className="text-secondary mt-4 text-sm leading-[1.55]">{outcome.supporting}</p>
              </Card>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
