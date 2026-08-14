/**
 * Date formatting — PRD 41.1 lists this as logic that can silently be wrong,
 * so the rules are stated here rather than inlined at call sites.
 *
 * All dates arrive from Postgres `date` columns as 'YYYY-MM-DD'. They are
 * parsed as UTC deliberately: `new Date('2026-04-01')` is UTC midnight, but
 * `new Date(2026, 3, 1)` is local midnight, and in a UTC+5:30 timezone the
 * two disagree about which month a date falls in when formatted locally.
 */

const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const FULL_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  return Number.isNaN(date.getTime()) ? null : date
}

/** "Apr 2026" */
export function formatMonthYear(value: string | null): string | null {
  const date = value ? parseISODate(value) : null
  return date ? MONTH_YEAR.format(date) : null
}

/** "1 Apr 2026" */
export function formatFullDate(value: string | null): string | null {
  const date = value ? parseISODate(value) : null
  return date ? FULL_DATE.format(date) : null
}

export function getYear(value: string | null): string | null {
  const date = value ? parseISODate(value) : null
  return date ? String(date.getUTCFullYear()) : null
}

/**
 * "Apr 2026 — Present" / "Apr 2024 — Mar 2026" / "Apr 2026"
 *
 * FR-EXP-05: a current role reads "Present". The em dash is the display
 * separator; screen readers get the spoken form from `formatDateRangeLabel`.
 */
export function formatDateRange(
  start: string | null,
  end: string | null,
  isCurrent = false,
): string {
  const from = formatMonthYear(start)
  if (!from) return ''
  if (isCurrent) return `${from} — Present`
  const to = formatMonthYear(end)
  return to ? `${from} — ${to}` : from
}

/**
 * The same range as prose, for `aria-label`. FR-EXP-05 requires "Present" to
 * be announced as "to present"; an em dash is read as nothing by most screen
 * readers, which would merge the two dates into one utterance.
 */
export function formatDateRangeLabel(
  start: string | null,
  end: string | null,
  isCurrent = false,
): string {
  const from = formatMonthYear(start)
  if (!from) return ''
  if (isCurrent) return `From ${from} to present`
  const to = formatMonthYear(end)
  return to ? `From ${from} to ${to}` : from
}

/**
 * Education status as display text — FR-EDU-03 / AC-EDU-2.
 * "Expected 2027" is rendered explicitly, never implied by a bare date.
 */
export function formatEducationStatus(
  status: 'completed' | 'in_progress' | 'expected',
  endDate: string | null,
): string {
  const year = getYear(endDate)
  switch (status) {
    case 'expected':
      return year ? `Expected ${year}` : 'Expected'
    case 'in_progress':
      return 'In progress'
    case 'completed':
      return year ?? 'Completed'
  }
}

/** `datetime` attribute for a <time> element. */
export function toDateTimeAttr(value: string | null): string | undefined {
  return value ? (parseISODate(value) ? value.slice(0, 10) : undefined) : undefined
}

export const currentYear = (): number => new Date().getFullYear()
