/**
 * Site settings — PRD 23.15.
 *
 * `site_settings` is a key/value table, so the database can only promise
 * `jsonb`. This module is where that becomes typed: each registered key
 * declares its value type and a parser, and `parseSettings` turns the rows
 * into a checked object. A malformed or missing value falls back rather than
 * propagating `undefined` into a render.
 *
 * Each key is also documented in docs/settings.md.
 */

export type SiteSettings = {
  /** Default <title> and og:site_name. */
  siteTitle: string
  /** Default meta description. */
  siteDescription: string
  /** Storage path in the `profile` bucket for the site-wide OG image. */
  defaultOgImagePath: string | null
  /** Hero availability pill text. Null hides the pill entirely (Q-20). */
  availabilityLabel: string | null
  /** Response-time expectation on /contact. Null hides the line (Q-19). */
  contactResponseNote: string | null
  /** FR-CONT-09 Turnstile (P2). */
  contactCaptchaEnabled: boolean
  /** ANA-04 master switch. */
  analyticsEnabled: boolean
  /** Shows the Resume action in the header — still gated by a published
   *  resume actually existing (FR-RES-06). */
  navResumeVisible: boolean
  /** P2. Public routes show a notice; /admin stays reachable. */
  maintenanceMode: boolean
  /** Canonical origin (SEO-05). Null falls back to VITE_SITE_URL (Q-11). */
  canonicalBaseUrl: string | null
}

/**
 * Defaults are the SAFE reading, not the convenient one: nothing is announced
 * that has not been configured. A null availability label hides the pill
 * rather than inventing "Available for work", and `contactResponseNote` stays
 * null rather than promising a response time nobody agreed to (Q-19).
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: 'Moin Patel',
  siteDescription:
    'Building AI-powered systems that automate work, save time, and reduce business costs.',
  defaultOgImagePath: null,
  availabilityLabel: null,
  contactResponseNote: null,
  contactCaptchaEnabled: false,
  analyticsEnabled: false,
  navResumeVisible: true,
  maintenanceMode: false,
  canonicalBaseUrl: null,
}

/** Database key -> settings field. The single registry of what exists. */
const KEY_MAP = {
  site_title: 'siteTitle',
  site_description: 'siteDescription',
  default_og_image_path: 'defaultOgImagePath',
  availability_label: 'availabilityLabel',
  contact_response_note: 'contactResponseNote',
  contact_captcha_enabled: 'contactCaptchaEnabled',
  analytics_enabled: 'analyticsEnabled',
  nav_resume_visible: 'navResumeVisible',
  maintenance_mode: 'maintenanceMode',
  canonical_base_url: 'canonicalBaseUrl',
} as const satisfies Record<string, keyof SiteSettings>

type SettingKey = keyof typeof KEY_MAP

function isSettingKey(key: string): key is SettingKey {
  return key in KEY_MAP
}

/** An empty string is treated as "not set" — trailing whitespace in an admin
 *  field should not become a visible empty element. */
function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function parseSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const settings: SiteSettings = { ...DEFAULT_SETTINGS }

  for (const row of rows) {
    if (!isSettingKey(row.key)) continue
    const field = KEY_MAP[row.key]

    switch (field) {
      case 'siteTitle':
      case 'siteDescription': {
        const parsed = asNullableString(row.value)
        if (parsed !== null) settings[field] = parsed
        break
      }
      case 'defaultOgImagePath':
      case 'availabilityLabel':
      case 'contactResponseNote':
      case 'canonicalBaseUrl':
        settings[field] = asNullableString(row.value)
        break
      case 'contactCaptchaEnabled':
      case 'analyticsEnabled':
      case 'navResumeVisible':
      case 'maintenanceMode':
        if (typeof row.value === 'boolean') settings[field] = row.value
        break
    }
  }

  return settings
}
