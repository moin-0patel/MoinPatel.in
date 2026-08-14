import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS, parseSettings } from './settings'

/**
 * Settings parsing — PRD 23.15.
 *
 * `site_settings.value` is `jsonb`, so the database can only promise "some
 * JSON". This is where that becomes typed, and the failure mode it guards
 * against is specific: a malformed or missing value must fall back to a safe
 * default rather than propagating `undefined` into a render.
 *
 * "Safe" here means the quiet option. A null availability label hides the hero
 * pill rather than inventing "Available for work"; a null response note hides
 * the line rather than promising a turnaround nobody agreed (Q-19, Q-20).
 */

describe('parseSettings — defaults', () => {
  it('returns the defaults for an empty row set', () => {
    expect(parseSettings([])).toEqual(DEFAULT_SETTINGS)
  })

  it('defaults the announcement fields to null, not to invented copy', () => {
    const settings = parseSettings([])
    expect(settings.availabilityLabel).toBeNull()
    expect(settings.contactResponseNote).toBeNull()
    expect(settings.canonicalBaseUrl).toBeNull()
    expect(settings.defaultOgImagePath).toBeNull()
  })

  it('defaults analytics and captcha off', () => {
    // ANA-04 / FR-CONT-09: collection and third-party verification are opt-in.
    expect(DEFAULT_SETTINGS.analyticsEnabled).toBe(false)
    expect(DEFAULT_SETTINGS.contactCaptchaEnabled).toBe(false)
    expect(DEFAULT_SETTINGS.maintenanceMode).toBe(false)
  })
})

describe('parseSettings — mapping', () => {
  it('maps snake_case keys onto camelCase fields', () => {
    const settings = parseSettings([
      { key: 'site_title', value: 'Moin Patel' },
      { key: 'availability_label', value: 'Open to work' },
      { key: 'nav_resume_visible', value: false },
      { key: 'canonical_base_url', value: 'https://moinpatel.in' },
    ])
    expect(settings.siteTitle).toBe('Moin Patel')
    expect(settings.availabilityLabel).toBe('Open to work')
    expect(settings.navResumeVisible).toBe(false)
    expect(settings.canonicalBaseUrl).toBe('https://moinpatel.in')
  })

  it('ignores unknown keys instead of throwing', () => {
    // A key added to the database ahead of the code must not break the site.
    const settings = parseSettings([
      { key: 'not_a_registered_key', value: 'whatever' },
      { key: 'site_title', value: 'Kept' },
    ])
    expect(settings.siteTitle).toBe('Kept')
  })

  it('trims strings and treats whitespace-only as not set', () => {
    // Trailing whitespace in an admin field must not become a visible empty
    // element in the hero.
    const settings = parseSettings([
      { key: 'availability_label', value: '   ' },
      { key: 'contact_response_note', value: '  Replies within 2 working days  ' },
    ])
    expect(settings.availabilityLabel).toBeNull()
    expect(settings.contactResponseNote).toBe('Replies within 2 working days')
  })
})

describe('parseSettings — malformed values fall back rather than propagate', () => {
  it('keeps the default when a required string arrives as a non-string', () => {
    const settings = parseSettings([
      { key: 'site_title', value: 42 },
      { key: 'site_description', value: null },
    ])
    expect(settings.siteTitle).toBe(DEFAULT_SETTINGS.siteTitle)
    expect(settings.siteDescription).toBe(DEFAULT_SETTINGS.siteDescription)
  })

  it('keeps the default when a boolean arrives as a string', () => {
    // `"false"` is truthy in JavaScript. Coercing it would silently enable
    // analytics that were meant to be off.
    const settings = parseSettings([
      { key: 'analytics_enabled', value: 'false' },
      { key: 'maintenance_mode', value: 1 },
    ])
    expect(settings.analyticsEnabled).toBe(false)
    expect(settings.maintenanceMode).toBe(false)
  })

  it('nulls a nullable string when it arrives as a non-string', () => {
    const settings = parseSettings([{ key: 'availability_label', value: { nested: true } }])
    expect(settings.availabilityLabel).toBeNull()
  })

  it('never returns undefined for any field', () => {
    const settings = parseSettings([{ key: 'site_title', value: undefined }])
    for (const [field, value] of Object.entries(settings)) {
      expect(value, `${field} was undefined`).not.toBeUndefined()
    }
  })
})
