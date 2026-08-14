import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

import { env } from './env'

/**
 * The single browser Supabase client — PRD 31.1.
 *
 * Prohibited, and enforced by ESLint (see `eslint.config.js`):
 *   - creating additional clients per module
 *   - instantiating a service-role client anywhere in `src/`
 *   - importing this module from `components/`, `sections/`, `pages/` or
 *     `hooks/`. Only `src/services/*` may reach transport (FE-01, FE-03).
 *
 * Typing the client with the generated `Database` type is what makes every
 * query column-checked at compile time; that is why `db:types` must be re-run
 * after every migration (MIG-08).
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    persistSession: true, // FR-AUTH-03
    autoRefreshToken: true, // FR-AUTH-03
    detectSessionInUrl: true, // password-reset / magic-link callbacks (FR-AUTH-08)
    flowType: 'pkce',
  },
  global: {
    headers: { 'x-application-name': 'moin-portfolio' },
  },
})
