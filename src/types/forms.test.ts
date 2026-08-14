import { describe, expect, it } from 'vitest'

import { coerceServiceType, contactFormSchema, SERVICE_TYPES, type ServiceTypeValue } from './forms'

/**
 * Contact form schema — PRD 41.1: "every contact-form boundary (min/max
 * lengths, invalid emails, invalid service type)."
 *
 * Every bound asserted here mirrors a CHECK constraint in
 * 20260815090600_create_contact_tables.sql. That duplication is deliberate
 * (SEC-04) and these tests are what keep the two in step: if someone relaxes
 * the schema without touching the constraint, a visitor gets a green form and
 * then an opaque save failure.
 */

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  subject: 'Automating a manual process',
  message: 'We currently retype handwritten order slips every evening and it takes hours.',
  // Widened deliberately: `as const` would narrow the field to this single
  // literal and the `SERVICE_TYPES` loop below could not override it.
  serviceType: 'business_process_automation' as ServiceTypeValue,
  website: '',
}

const parse = (overrides: Partial<typeof valid>) =>
  contactFormSchema.safeParse({ ...valid, ...overrides })

describe('contactFormSchema — happy path', () => {
  it('accepts a well-formed submission', () => {
    expect(parse({}).success).toBe(true)
  })

  it('accepts an omitted company', () => {
    expect(parse({ company: '' }).success).toBe(true)
  })
})

describe('name — 2 to 80 characters, trimmed', () => {
  it('rejects fewer than 2 characters', () => {
    expect(parse({ name: 'A' }).success).toBe(false)
  })

  it('rejects whitespace-only, because it trims first', () => {
    // Without the trim this passes the length check and stores "   ", which
    // the database then rejects on its own trimmed CHECK.
    expect(parse({ name: '   ' }).success).toBe(false)
  })

  it('accepts exactly 2 and exactly 80', () => {
    expect(parse({ name: 'Jo' }).success).toBe(true)
    expect(parse({ name: 'a'.repeat(80) }).success).toBe(true)
  })

  it('rejects 81', () => {
    expect(parse({ name: 'a'.repeat(81) }).success).toBe(false)
  })
})

describe('email', () => {
  it('rejects malformed addresses', () => {
    for (const email of ['ada', 'ada@', '@example.com', 'ada@example', 'a b@example.com', '']) {
      expect(parse({ email }).success, `expected "${email}" to be rejected`).toBe(false)
    }
  })

  it('lowercases on parse, so the stored value matches the citext column', () => {
    const result = parse({ email: 'Ada@Example.COM' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('ada@example.com')
  })

  it('trims surrounding whitespace', () => {
    const result = parse({ email: '  ada@example.com  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('ada@example.com')
  })

  it('rejects addresses longer than 160 characters', () => {
    expect(parse({ email: `${'a'.repeat(160)}@example.com` }).success).toBe(false)
  })
})

describe('subject — 3 to 150', () => {
  it('rejects fewer than 3', () => {
    expect(parse({ subject: 'Hi' }).success).toBe(false)
  })
  it('accepts the bounds', () => {
    expect(parse({ subject: 'Hey' }).success).toBe(true)
    expect(parse({ subject: 'a'.repeat(150) }).success).toBe(true)
  })
  it('rejects 151', () => {
    expect(parse({ subject: 'a'.repeat(151) }).success).toBe(false)
  })
})

describe('message — 20 to 4000', () => {
  it('rejects fewer than 20 characters', () => {
    expect(parse({ message: 'too short' }).success).toBe(false)
  })

  it('accepts exactly 20 and exactly 4000', () => {
    expect(parse({ message: 'a'.repeat(20) }).success).toBe(true)
    expect(parse({ message: 'a'.repeat(4000) }).success).toBe(true)
  })

  it('rejects 4001', () => {
    expect(parse({ message: 'a'.repeat(4001) }).success).toBe(false)
  })

  it('measures the TRIMMED length, matching the database CHECK', () => {
    // 10 real characters padded to 30 must fail, because the constraint is
    // `length(btrim(message)) between 20 and 4000`.
    expect(parse({ message: `${' '.repeat(10)}0123456789${' '.repeat(10)}` }).success).toBe(false)
  })
})

describe('serviceType', () => {
  it('accepts every enum member', () => {
    for (const serviceType of SERVICE_TYPES) {
      expect(parse({ serviceType }).success, serviceType).toBe(true)
    }
  })

  it('rejects a value outside the enum', () => {
    expect(contactFormSchema.safeParse({ ...valid, serviceType: 'data_reporting' }).success).toBe(
      false,
    )
  })
})

describe('honeypot (FR-CONT-08, AC-CONT-7)', () => {
  it('accepts an empty honeypot', () => {
    expect(parse({ website: '' }).success).toBe(true)
  })

  it('rejects a filled honeypot', () => {
    // A human cannot reach this field: it is off-screen, aria-hidden and
    // tabindex=-1. Anything in it is not a human.
    expect(contactFormSchema.safeParse({ ...valid, website: 'http://spam.example' }).success).toBe(
      false,
    )
  })
})

describe('coerceServiceType (FR-CONT-02, AC-CONT-3)', () => {
  it('passes through a valid value', () => {
    expect(coerceServiceType('ai_automation')).toBe('ai_automation')
  })

  it('falls back to "other" for an invalid value rather than erroring', () => {
    // A stale or hand-edited link must not block a visitor from writing in.
    expect(coerceServiceType('nonsense')).toBe('other')
    expect(coerceServiceType('data_reporting')).toBe('other')
  })

  it('falls back to "other" for null and undefined', () => {
    expect(coerceServiceType(null)).toBe('other')
    expect(coerceServiceType(undefined)).toBe('other')
  })
})
