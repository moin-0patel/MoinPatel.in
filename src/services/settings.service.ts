import { reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
import { parseSettings, type SiteSettings } from '@/types/settings'

/**
 * Settings service — PRD 23.15, 25.1.
 *
 * The query asks for everything the caller is allowed to see; the RLS policy
 * (`using (is_public)`) decides what that is. There is no client-side key
 * allow-list here on purpose — duplicating the list would mean two places to
 * forget, and the database is the one that actually enforces it.
 */
export async function getPublicSettings(): Promise<SiteSettings> {
  const context = 'settings.getPublicSettings'
  try {
    const { data, error } = await supabase.from('site_settings').select('key, value').limit(50)
    if (error) throw error
    return parseSettings(data)
  } catch (cause) {
    throw reportError(cause, context)
  }
}
