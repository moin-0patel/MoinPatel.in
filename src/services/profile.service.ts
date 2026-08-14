import { reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
import type { Profile } from '@/types/domain'

/**
 * Profile service — the singleton owner identity (PRD 23.1).
 *
 * API-01: `phone_public` is selected because the gate below needs it, but the
 * mapper drops it unless `phone_visible` is true. The domain type therefore
 * cannot carry a phone number the owner has not agreed to publish (Q-10), so
 * no component can render one.
 */
export async function getProfile(): Promise<Profile | null> {
  const context = 'profile.getProfile'
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        `full_name, role_title, positioning_line, tagline, short_bio, long_bio_md,
         location, email_public, phone_public, phone_visible,
         avatar_path, avatar_alt, og_image_path, available_for_work`,
      )
      .eq('published', true) // API-02
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      fullName: data.full_name,
      roleTitle: data.role_title,
      positioningLine: data.positioning_line,
      tagline: data.tagline,
      shortBio: data.short_bio,
      longBioMd: data.long_bio_md,
      location: data.location,
      emailPublic: data.email_public,
      phonePublic: data.phone_visible ? data.phone_public : null,
      avatarPath: data.avatar_path,
      avatarAlt: data.avatar_alt,
      ogImagePath: data.og_image_path,
      availableForWork: data.available_for_work,
    }
  } catch (cause) {
    throw reportError(cause, context)
  }
}
