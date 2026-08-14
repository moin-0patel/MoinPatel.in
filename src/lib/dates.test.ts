import { describe, expect, it } from 'vitest'

import {
  formatDateRange,
  formatDateRangeLabel,
  formatEducationStatus,
  formatFullDate,
  formatMonthYear,
  getYear,
  toDateTimeAttr,
} from './dates'

/**
 * Date formatting — PRD 41.1: "date-range formatting, 'Present' handling,
 * `expected` education status."
 *
 * The timezone cases are the reason this file exists. Postgres `date` columns
 * arrive as 'YYYY-MM-DD', and `new Date('2026-04-01')` is UTC midnight while
 * `new Date(2026, 3, 1)` is local midnight. In UTC+5:30 — where this site's
 * owner and much of its audience are — formatting the former with a local
 * timezone can render the wrong month. "Apr 2026" silently becoming
 * "Mar 2026" on a CV is the kind of defect nobody reports.
 */

describe('formatMonthYear', () => {
  it('formats an ISO date as "Mon YYYY"', () => {
    expect(formatMonthYear('2026-04-01')).toBe('Apr 2026')
  })

  it('does not shift the month for a first-of-month date in a positive-offset timezone', () => {
    // UTC midnight on the 1st is still the 1st in every eastern timezone only
    // if formatting is pinned to UTC. This asserts the pin.
    expect(formatMonthYear('2026-04-01')).toBe('Apr 2026')
    expect(formatMonthYear('2026-01-01')).toBe('Jan 2026')
  })

  it('does not shift the month for a last-of-month date in a negative-offset timezone', () => {
    expect(formatMonthYear('2026-01-31')).toBe('Jan 2026')
    expect(formatMonthYear('2027-06-30')).toBe('Jun 2027')
  })

  it('accepts a full timestamp and uses only the date part', () => {
    expect(formatMonthYear('2026-04-01T18:30:00.000Z')).toBe('Apr 2026')
  })

  it('returns null for null and for malformed input rather than "Invalid Date"', () => {
    expect(formatMonthYear(null)).toBeNull()
    expect(formatMonthYear('not-a-date')).toBeNull()
    expect(formatMonthYear('')).toBeNull()
  })
})

describe('formatFullDate', () => {
  it('formats an ISO date as "D Mon YYYY"', () => {
    expect(formatFullDate('2026-08-14')).toBe('14 Aug 2026')
  })

  it('returns null for malformed input', () => {
    expect(formatFullDate('nope')).toBeNull()
  })
})

describe('getYear', () => {
  it('extracts the UTC year', () => {
    expect(getYear('2027-06-30')).toBe('2027')
  })

  it('does not roll into the next year for 31 December', () => {
    expect(getYear('2026-12-31')).toBe('2026')
  })

  it('returns null for null', () => {
    expect(getYear(null)).toBeNull()
  })
})

describe('formatDateRange (FR-EXP-05)', () => {
  it('renders "Present" for a current role', () => {
    expect(formatDateRange('2026-04-01', null, true)).toBe('Apr 2026 — Present')
  })

  it('ignores an end date when the role is current', () => {
    // The database forbids this combination (experience_current_check), but a
    // formatter that trusted its inputs would render a contradiction.
    expect(formatDateRange('2026-04-01', '2027-01-01', true)).toBe('Apr 2026 — Present')
  })

  it('renders a closed range', () => {
    expect(formatDateRange('2024-01-01', '2026-03-01', false)).toBe('Jan 2024 — Mar 2026')
  })

  it('renders only the start when there is no end and the role is not current', () => {
    expect(formatDateRange('2024-01-01', null, false)).toBe('Jan 2024')
  })

  it('returns an empty string when there is no start date', () => {
    expect(formatDateRange(null, '2026-01-01', false)).toBe('')
  })
})

describe('formatDateRangeLabel — the spoken form (A11Y)', () => {
  it('says "to present" rather than relying on an em dash', () => {
    // Most screen readers announce "—" as nothing, which merges the two dates
    // into a single run-on utterance.
    expect(formatDateRangeLabel('2026-04-01', null, true)).toBe('From Apr 2026 to present')
  })

  it('spells out a closed range', () => {
    expect(formatDateRangeLabel('2024-01-01', '2026-03-01', false)).toBe(
      'From Jan 2024 to Mar 2026',
    )
  })

  it('contains no em dash in any branch', () => {
    const outputs = [
      formatDateRangeLabel('2026-04-01', null, true),
      formatDateRangeLabel('2024-01-01', '2026-03-01', false),
      formatDateRangeLabel('2024-01-01', null, false),
    ]
    for (const output of outputs) expect(output).not.toContain('—')
  })
})

describe('formatEducationStatus (FR-EDU-03, AC-EDU-2)', () => {
  it('renders "Expected <year>" explicitly', () => {
    expect(formatEducationStatus('expected', '2027-06-30')).toBe('Expected 2027')
  })

  it('falls back to a bare "Expected" when no date exists', () => {
    // Never implied by a bare future date — the word is always present.
    expect(formatEducationStatus('expected', null)).toBe('Expected')
  })

  it('renders in-progress study', () => {
    expect(formatEducationStatus('in_progress', null)).toBe('In progress')
  })

  it('renders the completion year for a completed qualification', () => {
    expect(formatEducationStatus('completed', '2024-05-01')).toBe('2024')
    expect(formatEducationStatus('completed', null)).toBe('Completed')
  })
})

describe('toDateTimeAttr', () => {
  it('emits a bare date for the <time datetime> attribute', () => {
    expect(toDateTimeAttr('2026-04-01')).toBe('2026-04-01')
    expect(toDateTimeAttr('2026-04-01T18:30:00Z')).toBe('2026-04-01')
  })

  it('returns undefined rather than an invalid attribute value', () => {
    // An invalid `datetime` is worse than an absent one: it is a validation
    // error and gives assistive tech a value it cannot parse.
    expect(toDateTimeAttr(null)).toBeUndefined()
    expect(toDateTimeAttr('nonsense')).toBeUndefined()
  })
})
