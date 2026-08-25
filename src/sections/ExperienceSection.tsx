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
import { formatDateRange, formatDateRangeLabel, toDateTimeAttr } from '@/lib/dates'
import type { ExperienceRecord } from '@/types/domain'

/**
 * Experience — PRD 12.7 (Home summary) and 15 (the /experience page).
 *
 * The timeline rail IS the process-line motif from 8.5: a thin connector with
 * node markers. Using the same visual language for a career and for a data
 * pipeline is deliberate — both are ordered sequences, and the motif is meant
 * to be structural rather than decorative.
 *
 * RES-04: below 768px the rail is dropped and items become plain cards. A
 * decorative vertical line costs horizontal space that a phone does not have.
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
          title="Where I work"
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
          title="Where I work"
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
        <SectionHeading
          id="experience-heading"
          eyebrow="Experience"
          meta="SYS_EVOLUTION"
          title="Where I work"
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

      <ol className="mt-8 md:relative md:pl-8">
        {/* The rail. Desktop only (RES-04), and decorative. */}
        <span
          aria-hidden="true"
          className="via-accent/30 absolute top-2 bottom-2 left-[3px] hidden w-px bg-gradient-to-b from-transparent to-transparent md:block"
        />
        {visible.map((record) => (
          <li key={record.id} className="relative pb-8 last:pb-0">
            <span
              aria-hidden="true"
              className="bg-accent ring-base absolute top-2 -left-8 hidden size-2 rounded-full ring-4 md:block"
            />
            <TimelineItem record={record} />
          </li>
        ))}
      </ol>
    </Section>
  )
}

/*
 * A card on a phone and a bare timeline row from `md` up — which is why this is
 * the one Card on the site with `edge={false}`.
 *
 * The top hairline is a grouping device for a GRID of panels. This is a
 * chronology: the rule that groups it is the timeline's own spine, and a second
 * horizontal rule per entry fights it.
 *
 * Dropping it also repairs a latent bug. `rim-light` drew its stroke as a
 * masked ::before, so `md:border-0` never removed it — from `md` up the row was
 * borderless and transparent with a white gradient hairline still painted
 * around where its edges used to be.
 */
function TimelineItem({ record }: { record: ExperienceRecord }) {
  return (
    <Card as="article" interactive edge={false} className="md:border-0 md:bg-transparent md:p-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-primary text-lg">
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
