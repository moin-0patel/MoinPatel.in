import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Section, SectionHeading } from '@/components/common/Section'
import { ErrorState } from '@/components/common/States'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton'
import { useExperience } from '@/hooks/useSiteContent'
import { cn } from '@/lib/cn'
import { formatDateRange, formatDateRangeLabel, toDateTimeAttr } from '@/lib/dates'
import type { ExperienceRecord } from '@/types/domain'

/**
 * Experience — PRD 12.7 (Home summary) and 15 (the /experience page).
 *
 * Presented as the reference presents its journey: alternating cards hung off
 * a thin center rule, each led by a large year marker derived from the
 * record's real start date. The measured geometry and every deliberate
 * divergence are documented at the list below.
 *
 * Below lg the rule and alternation drop and the cards stack full-width —
 * which is the reference's own mobile behaviour (its 390px journey is a
 * single column of cards), not a shrunken desktop.
 */
export function ExperienceSection({
  /** Home shows the current role in full plus a compact list; /experience
   *  shows everything. */
  variant = 'summary',
}: {
  variant?: 'summary' | 'full'
}) {
  const { data: experience, isPending, isError, error, refetch } = useExperience()

  if (isPending) {
    return (
      <Section id="experience" labelledBy="experience-heading">
        <SectionHeading
          id="experience-heading"
          eyebrow="Experience"
          meta="SYS_EVOLUTION"
          title="My journey"
        />
        <LoadingRegion label="Loading experience" className="space-y-6">
          <Skeleton className="h-32 w-full rounded-[--radius-lg]" />
          <Skeleton className="h-24 w-full rounded-[--radius-lg]" />
        </LoadingRegion>
      </Section>
    )
  }

  if (isError) {
    return (
      <Section id="experience" labelledBy="experience-heading">
        <SectionHeading
          id="experience-heading"
          eyebrow="Experience"
          meta="SYS_EVOLUTION"
          title="My journey"
        />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Section>
    )
  }

  // FR-EXP-07 — hidden on Home when there is nothing published.
  if (experience.length === 0) return null

  const visible = variant === 'summary' ? experience.slice(0, 2) : experience

  return (
    <Section id="experience" labelledBy="experience-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/*
         * "My journey" — the reference's own framing ("About Me (&) My
         * Journey", measured 65.95px/500). Its about block and journey are one
         * composition; ours are two adjacent sections because the IA keeps
         * Experience addressable on its own route, so the journey takes the
         * journey half of the reference's title and About keeps the other.
         */}
        <SectionHeading
          id="experience-heading"
          eyebrow="Experience"
          meta="SYS_EVOLUTION"
          title="My journey"
          className="mb-0"
        />
        {variant === 'summary' && experience.length > 0 && (
          <Button variant="ghost" asChild className="mb-1">
            <Link to="/experience">
              Full experience
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>

      {/*
       * THE JOURNEY — the reference's About/Journey composition, measured live
       * at 1440x900 with real wheel events:
       *
       *   cards       `.about-card`, 426 x 346, radius 11.95px, padding 30px,
       *               alternating left/right down the section, the FIRST on
       *               the right
       *   year        "'19" — apostrophe + two digits, 80.06px/700, set in the
       *               accent, first element inside the card
       *   title       24.05px/500 black under the year
       *   body        16.99px, meta at 50% black, a small pill button
       *   connector   a thin winding SVG path with small accent nodes running
       *               card to card
       *
       * WHAT IS DIFFERENT HERE, AND WHY
       *
       *   Seven entries become however many experience records exist — one,
       *   today. The brief is explicit: keep the space, do not manufacture
       *   entries. The alternation and the rail are built and simply have
       *   little to do until more records exist.
       *
       *   The winding SVG is a straight center rule. A path that meanders
       *   between seven scattered cards is drawing the shape of seven pieces
       *   of data; with one or two it is a squiggle with nothing to connect.
       *   The rule keeps the connector's job — one line the entries hang off —
       *   at the density we actually have.
       *
       *   The reference's year is its 1.4:1 highlighter yellow, decorative by
       *   intent. Ours is `--color-accent-word`, the darkest cyan that clears
       *   the 3:1 large-text threshold (3.12:1) — the exact trade the hero
       *   wordmark already made, recorded in tokens.css.
       *
       *   No avatar chips and no "Read more" popup: the avatars are photos of
       *   the reference author's colleagues, and the popup opens long-form
       *   copy that has no factual equivalent in the database. Omitted rather
       *   than imitated with invented content.
       */}
      <ol className="relative mt-10 lg:mt-16">
        {/* The connector. Decorative, lg-up where the alternation exists. */}
        <span
          aria-hidden="true"
          className="bg-subtle absolute top-2 bottom-2 left-1/2 hidden w-px -translate-x-1/2 lg:block"
        />
        {visible.map((record, index) => (
          <li
            key={record.id}
            className={cn(
              'relative pb-10 last:pb-0 lg:w-[calc(50%-2.5rem)]',
              // The reference's first card sits on the RIGHT of the line.
              index % 2 === 0 ? 'lg:ml-auto' : 'lg:mr-auto',
            )}
          >
            {/* The node — the reference's small accent dot on the line. */}
            <span
              aria-hidden="true"
              className={cn(
                'bg-accent-fill absolute top-8 hidden size-2.5 rounded-full ring-1 ring-black/60 lg:block',
                index % 2 === 0 ? 'left-[calc(-2.5rem_-_5px)]' : 'right-[calc(-2.5rem_-_5px)]',
              )}
            />
            <TimelineItem record={record} />
          </li>
        ))}
      </ol>
    </Section>
  )
}

/*
 * A journey card at every width — the reference keeps the card on desktop too,
 * which retires this component's old "card on a phone, bare row from md up"
 * split entirely.
 *
 * `edge={false}` stays: the reference journey card has no top hairline — the
 * connector line is the grouping device, and a rule per card fights it.
 * `interactive` is gone because the card is not a link; the reference card
 * carries a Read-more popup we deliberately do not reproduce (its long-form
 * copy has no database equivalent), so nothing here responds to hover.
 *
 * `rounded-[12px] p-[30px]` are the measured card values (11.95px / 29.95px),
 * overriding the Card primitive's defaults the same way WorkCard's measured
 * radius does — tailwind-merge keeps the later class.
 *
 * THE YEAR MARKER is derived from the record's real start date — "'26" for
 * 2026, the reference's apostrophe format at its measured 80px/700. It is
 * aria-hidden because the full range is already announced by the <time>
 * element below it; the marker is the composition, not the data.
 *
 * #0b7886 is a literal because it is a per-surface solve, not a new token.
 * `--color-accent-word` (#0b7d8c) was solved against the PAGE ground and axe
 * measured it at 2.87:1 here — this marker sits on the CARD surface (#cdc7b5),
 * which is darker. 96% of the same hue is the lightest value clearing the 3:1
 * large-text threshold on the card (3.07:1), the identical trade the wordmark
 * records in tokens.css. aria-hidden does not exempt it: the contrast rule is
 * about sighted readers, and axe rightly checks it anyway.
 */
function TimelineItem({ record }: { record: ExperienceRecord }) {
  const startYear = new Date(record.startDate).getFullYear()

  return (
    <Card as="article" edge={false} data-journey-card="" className="rounded-[12px] p-[30px]">
      {Number.isFinite(startYear) && (
        <p
          aria-hidden="true"
          className="font-display mb-4 text-[clamp(3.25rem,5.5vw,5rem)] leading-none font-bold text-[#0b7886]"
        >
          &rsquo;{String(startYear).slice(-2)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/*
         * 24px, not the 29px text-2xl this once defaulted to: the frozen audit
         * puts the reference's timeline entry titles at 24.05px/500 with a 1.1
         * line-height, and §12.3 holds headings to ±10% of the measured scale.
         * --text-xl lands on 23px at 1440 — inside the band.
         */}
        <h3 className="text-primary font-display text-[length:var(--text-xl)] leading-[1.1] font-medium">
          {record.companyUrl ? (
            <a
              href={record.companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent underline underline-offset-4"
            >
              {record.company}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ) : (
            record.company
          )}
        </h3>
        {/* FR-EXP-05 — a current role is marked as current, in text. */}
        {record.isCurrent && <Badge tone="success">Current</Badge>}
      </div>

      {/*
       * FR-EXP-06 — concurrent titles are one record with titles separated by
       * ' · '. Three separate rows would render as three employers, which
       * would misstate the CV.
       */}
      <p className="text-accent mt-1 text-sm">{record.roleTitle}</p>

      <p className="text-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
        {/* A11Y — the em-dash range is read as one run-on by most screen
            readers, so the spoken form is supplied separately. */}
        <time dateTime={toDateTimeAttr(record.startDate)}>
          <span aria-hidden="true">
            {formatDateRange(record.startDate, record.endDate, record.isCurrent)}
          </span>
          <span className="visually-hidden">
            {formatDateRangeLabel(record.startDate, record.endDate, record.isCurrent)}
          </span>
        </time>
        {record.employmentType && <span aria-hidden="true">·</span>}
        {record.employmentType && <span>{record.employmentType}</span>}
        {record.location && <span aria-hidden="true">·</span>}
        {record.location && <span>{record.location}</span>}
      </p>

      {/* FR-EXP-03 — responsibilities and achievements are two SEPARATELY
          LABELLED lists, not one merged bullet list. */}
      {record.responsibilities.length > 0 && (
        <ItemList
          heading="Responsibilities"
          headingId={`resp-${record.id}`}
          items={record.responsibilities}
        />
      )}

      {record.achievements.length > 0 && (
        <ItemList
          heading="Achievements"
          headingId={`ach-${record.id}`}
          items={record.achievements}
        />
      )}

      {record.technologies.length > 0 && (
        <ChipRow className="mt-4">
          {record.technologies.map((tech) => (
            <Chip key={tech.id}>{tech.name}</Chip>
          ))}
        </ChipRow>
      )}
    </Card>
  )
}

function ItemList({
  heading,
  headingId,
  items,
}: {
  heading: string
  headingId: string
  items: { id: string; content: string }[]
}) {
  return (
    <div className="mt-4">
      <h4
        id={headingId}
        className="text-muted font-mono text-xs tracking-[--tracking-mono] uppercase"
      >
        {heading}
      </h4>
      {/* A11Y-01 — a labelled list, not a div soup. */}
      <ul aria-labelledby={headingId} className="measure mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="text-secondary flex gap-2 text-sm">
            <span aria-hidden="true" className="text-accent shrink-0">
              ·
            </span>
            {item.content}
          </li>
        ))}
      </ul>
    </div>
  )
}
