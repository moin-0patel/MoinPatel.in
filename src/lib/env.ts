/**
 * Environment access — PRD FE-08 / 31.2.
 *
 * This is the ONLY module in `src/` permitted to read `import.meta.env`; the
 * ESLint config enforces that. Everything else imports `env` from here, so a
 * missing variable is one loud failure at startup rather than a scattering of
 * `undefined` at runtime.
 *
 * SEC-01 restated: every value below is public by design. The service-role key
 * has no representation in this file, in `ImportMetaEnv`, or anywhere in `src/`.
 */

type RawEnv = {
  readonly VITE_SUPABASE_URL: string | undefined
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string | undefined
  readonly VITE_SITE_URL: string | undefined
}

export type Env = {
  /** Supabase project URL, no trailing slash. */
  readonly supabaseUrl: string
  /** Publishable (anon) key. Safe in the bundle only because RLS is correct. */
  readonly supabasePublishableKey: string
  /** Canonical origin for canonical URLs, sitemap and OG absolute paths. */
  readonly siteUrl: string
  readonly isDev: boolean
  readonly isProd: boolean
}

class EnvironmentError extends Error {
  override readonly name = 'EnvironmentError'
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function readEnv(): Env {
  const raw: RawEnv = import.meta.env
  const isDev = import.meta.env.DEV
  const missing: string[] = []

  const require_ = (key: keyof RawEnv): string => {
    const value = raw[key]?.trim()
    if (!value) {
      missing.push(key)
      return ''
    }
    return value
  }

  const supabaseUrl = require_('VITE_SUPABASE_URL')
  const supabasePublishableKey = require_('VITE_SUPABASE_PUBLISHABLE_KEY')
  const siteUrl = require_('VITE_SITE_URL')

  if (missing.length > 0) {
    throw new EnvironmentError(
      `Missing required environment variable${missing.length > 1 ? 's' : ''}: ` +
        `${missing.join(', ')}.\n` +
        'Copy .env.example to .env.local and fill it in. ' +
        'For the local stack, `supabase start` prints the URL and the publishable key.',
    )
  }

  // A malformed URL fails here rather than as an opaque fetch error later.
  for (const [key, value] of [
    ['VITE_SUPABASE_URL', supabaseUrl],
    ['VITE_SITE_URL', siteUrl],
  ] as const) {
    try {
      new URL(value)
    } catch {
      throw new EnvironmentError(`${key} is not a valid absolute URL: "${value}"`)
    }
  }

  /*
   * SEC-01 tripwire. A service-role JWT carries `"role":"service_role"`. If one
   * is ever pasted into the publishable slot, this catches it at startup
   * instead of shipping a key that bypasses every RLS policy in the product.
   */
  if (looksLikeServiceRoleKey(supabasePublishableKey)) {
    throw new EnvironmentError(
      'VITE_SUPABASE_PUBLISHABLE_KEY appears to hold a SERVICE ROLE key. ' +
        'That key bypasses Row Level Security and must never reach the browser. ' +
        'Use the publishable / anon key (SEC-01).',
    )
  }

  return {
    supabaseUrl: stripTrailingSlash(supabaseUrl),
    supabasePublishableKey,
    siteUrl: stripTrailingSlash(siteUrl),
    isDev,
    isProd: import.meta.env.PROD,
  }
}

function looksLikeServiceRoleKey(key: string): boolean {
  const payload = key.split('.')[1]
  if (!payload) return false
  try {
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return decoded.includes('"role":"service_role"') || decoded.includes('"role": "service_role"')
  } catch {
    return false
  }
}

export const env: Env = readEnv()

/** Absolute URL for a site-relative path — canonical tags, sitemap, OG. */
export function absoluteUrl(path: string): string {
  return `${env.siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}
