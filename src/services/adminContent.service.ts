import { reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

/**
 * Admin CRUD for the smaller content resources — PRD 20.2.
 *
 * experience (+ items) · skills (+ categories) · education · social links ·
 * profile · site settings.
 *
 * Grouped in one module rather than six because each is a short, flat list
 * with the same shape of operation. Projects, contact and resume stay separate
 * — they carry real behaviour (publish gates, spam triggers, signed URLs).
 *
 * Same boundary as admin.service.ts: a session gets you here, but `is_admin()`
 * in the RLS policies is what actually authorises every write.
 */

/* --- Experience ----------------------------------------------------------- */

export type AdminExperience = Tables<'experience'> & {
  items: Tables<'experience_items'>[]
}

export async function listAdminExperience(): Promise<AdminExperience[]> {
  const context = 'adminContent.listAdminExperience'
  try {
    const { data, error } = await supabase
      .from('experience')
      .select('*, experience_items(*)')
      .order('sort_order', { ascending: true })
      .order('start_date', { ascending: false })
      .limit(50)
    if (error) throw error

    return data.map((row) => {
      const { experience_items, ...experience } = row
      return {
        ...experience,
        items: [...experience_items].sort((a, b) => a.sort_order - b.sort_order),
      }
    })
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function upsertExperience(
  values: TablesInsert<'experience'>,
  id?: string,
): Promise<string> {
  const context = 'adminContent.upsertExperience'
  try {
    if (id) {
      const { error } = await supabase.from('experience').update(values).eq('id', id)
      if (error) throw error
      return id
    }
    const { data, error } = await supabase.from('experience').insert(values).select('id').single()
    if (error) throw error
    return data.id
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * Replace a role's responsibility and achievement bullets.
 *
 * FR-EXP-03 keeps them as two separately labelled, independently ordered
 * lists, so `sort_order` is assigned per type rather than across the whole set
 * — otherwise the second list would start numbering where the first left off
 * and reordering one would shuffle the other.
 */
export async function setExperienceItems(
  experienceId: string,
  responsibilities: string[],
  achievements: string[],
): Promise<void> {
  const context = 'adminContent.setExperienceItems'
  try {
    const { error: deleteError } = await supabase
      .from('experience_items')
      .delete()
      .eq('experience_id', experienceId)
    if (deleteError) throw deleteError

    const rows: TablesInsert<'experience_items'>[] = [
      ...responsibilities
        .filter((content) => content.trim() !== '')
        .map((content, index) => ({
          experience_id: experienceId,
          item_type: 'responsibility' as const,
          content: content.trim(),
          sort_order: index,
        })),
      ...achievements
        .filter((content) => content.trim() !== '')
        .map((content, index) => ({
          experience_id: experienceId,
          item_type: 'achievement' as const,
          content: content.trim(),
          sort_order: index,
        })),
    ]

    if (rows.length === 0) return
    const { error } = await supabase.from('experience_items').insert(rows)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function deleteExperience(id: string): Promise<void> {
  const context = 'adminContent.deleteExperience'
  try {
    const { error } = await supabase.from('experience').delete().eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Skills --------------------------------------------------------------- */

export type AdminSkillCategory = Tables<'skill_categories'> & {
  skills: Tables<'skills'>[]
}

export async function listAdminSkills(): Promise<AdminSkillCategory[]> {
  const context = 'adminContent.listAdminSkills'
  try {
    const { data, error } = await supabase
      .from('skill_categories')
      .select('*, skills(*)')
      .order('sort_order', { ascending: true })
      .limit(50)
    if (error) throw error

    return data.map((row) => {
      const { skills, ...category } = row
      return { ...category, skills: [...skills].sort((a, b) => a.sort_order - b.sort_order) }
    })
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function upsertSkillCategory(
  values: TablesInsert<'skill_categories'>,
  id?: string,
): Promise<void> {
  const context = 'adminContent.upsertSkillCategory'
  try {
    const { error } = id
      ? await supabase.from('skill_categories').update(values).eq('id', id)
      : await supabase.from('skill_categories').insert(values)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function upsertSkill(values: TablesInsert<'skills'>, id?: string): Promise<void> {
  const context = 'adminContent.upsertSkill'
  try {
    const { error } = id
      ? await supabase.from('skills').update(values).eq('id', id)
      : await supabase.from('skills').insert(values)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function deleteSkill(id: string): Promise<void> {
  const context = 'adminContent.deleteSkill'
  try {
    const { error } = await supabase.from('skills').delete().eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * `skill_categories -> skills` is ON DELETE RESTRICT (PRD 24), so the database
 * refuses to delete a category that still has skills rather than silently
 * taking them with it. The admin must reassign or delete them first, and the
 * UI says so — a raw foreign-key violation would not.
 */
export async function deleteSkillCategory(id: string): Promise<void> {
  const context = 'adminContent.deleteSkillCategory'
  try {
    const { error } = await supabase.from('skill_categories').delete().eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Education ------------------------------------------------------------ */

export async function listAdminEducation(): Promise<Tables<'education'>[]> {
  const context = 'adminContent.listAdminEducation'
  try {
    const { data, error } = await supabase
      .from('education')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('start_date', { ascending: false, nullsFirst: false })
      .limit(50)
    if (error) throw error
    return data
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function upsertEducation(
  values: TablesInsert<'education'>,
  id?: string,
): Promise<void> {
  const context = 'adminContent.upsertEducation'
  try {
    const { error } = id
      ? await supabase.from('education').update(values).eq('id', id)
      : await supabase.from('education').insert(values)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function deleteEducation(id: string): Promise<void> {
  const context = 'adminContent.deleteEducation'
  try {
    const { error } = await supabase.from('education').delete().eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Social links --------------------------------------------------------- */

export async function listAdminSocialLinks(): Promise<Tables<'social_links'>[]> {
  const context = 'adminContent.listAdminSocialLinks'
  try {
    const { data, error } = await supabase
      .from('social_links')
      .select('*')
      .order('sort_order', { ascending: true })
      .limit(50)
    if (error) throw error
    return data
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function upsertSocialLink(
  values: TablesInsert<'social_links'>,
  id?: string,
): Promise<void> {
  const context = 'adminContent.upsertSocialLink'
  try {
    const { error } = id
      ? await supabase.from('social_links').update(values).eq('id', id)
      : await supabase.from('social_links').insert(values)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function deleteSocialLink(id: string): Promise<void> {
  const context = 'adminContent.deleteSocialLink'
  try {
    const { error } = await supabase.from('social_links').delete().eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Profile and settings ------------------------------------------------- */

/** The singleton, read WITHOUT the `published` filter the public query uses. */
export async function getAdminProfile(): Promise<Tables<'profiles'> | null> {
  const context = 'adminContent.getAdminProfile'
  try {
    const { data, error } = await supabase.from('profiles').select('*').maybeSingle()
    if (error) throw error
    return data
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function updateProfile(id: string, patch: TablesUpdate<'profiles'>): Promise<void> {
  const context = 'adminContent.updateProfile'
  try {
    const { error } = await supabase.from('profiles').update(patch).eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function listAdminSettings(): Promise<Tables<'site_settings'>[]> {
  const context = 'adminContent.listAdminSettings'
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('key', { ascending: true })
      .limit(100)
    if (error) throw error
    return data
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * Write one setting's value.
 *
 * `is_public` is deliberately NOT settable from here. It drives the anon read
 * policy (25.1), so exposing it as an admin form field would turn a UI slip
 * into a data leak. Changing a key's visibility is a migration.
 */
export async function updateSetting(key: string, value: unknown): Promise<void> {
  const context = 'adminContent.updateSetting'
  try {
    const { error } = await supabase
      .from('site_settings')
      .update({ value: value as never })
      .eq('key', key)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}
