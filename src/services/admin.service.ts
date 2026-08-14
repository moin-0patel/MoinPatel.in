import { reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
import type { TablesUpdate } from '@/types/database.types'
import type {
  AdminProjectRow,
  ContactMessage,
  MessageStatus,
  PublicationState,
} from '@/types/domain'

/**
 * Admin service — PRD Section 20.
 *
 * Every function here is reachable only with a session, but that is NOT what
 * makes it safe. Each of these calls goes through RLS as the `authenticated`
 * role and is authorised row-by-row by `is_admin()`. A signed-in user without
 * an `admin_users` row gets exactly the same result as anonymous: nothing
 * (AC-AUTH-6, AC-RLS-5). The route guard in <ProtectedRoute> only stops them
 * seeing a screen that would fail anyway.
 *
 * Admin reads deliberately do NOT filter on publication state — the whole
 * point is seeing drafts. That is also why the query keys are a separate
 * branch from the public ones (lib/queryKeys.ts): sharing a cache entry
 * between "all projects" and "published projects" would leak drafts into a
 * public view.
 */

/* --- Dashboard ------------------------------------------------------------ */

export type DashboardCounts = {
  publishedProjects: number
  draftProjects: number
  unreadMessages: number
  publishedExperience: number
  publishedSkills: number
  publishedEducation: number
  hasPublishedResume: boolean
}

/**
 * FR-ADM-10. Uses `head: true` count queries, so the database returns the
 * number and not the rows — a dashboard should not download the inbox to
 * discover it has three unread messages.
 */
export async function getDashboardCounts(): Promise<DashboardCounts> {
  const context = 'admin.getDashboardCounts'

  /*
   * Written out per table rather than through a generic helper: a helper
   * parameterised over the table name collapses `.eq()`'s column type to the
   * intersection of all their columns, so `publication_state` stops
   * type-checking. Six explicit queries keep the compile-time column checking
   * that FE-06 exists for.
   */
  const COUNT = { count: 'exact', head: true } as const

  try {
    const [published, drafts, unread, experience, skills, education, resume] = await Promise.all([
      supabase.from('projects').select('*', COUNT).eq('publication_state', 'published'),
      supabase.from('projects').select('*', COUNT).eq('publication_state', 'draft'),
      supabase.from('contact_messages').select('*', COUNT).eq('status', 'new'),
      supabase.from('experience').select('*', COUNT).eq('publication_state', 'published'),
      supabase.from('skills').select('*', COUNT).eq('published', true),
      supabase.from('education').select('*', COUNT).eq('publication_state', 'published'),
      supabase.from('resume_versions').select('id').eq('is_published', true).maybeSingle(),
    ])

    for (const result of [published, drafts, unread, experience, skills, education, resume]) {
      if (result.error) throw result.error
    }

    return {
      publishedProjects: published.count ?? 0,
      draftProjects: drafts.count ?? 0,
      unreadMessages: unread.count ?? 0,
      publishedExperience: experience.count ?? 0,
      publishedSkills: skills.count ?? 0,
      publishedEducation: education.count ?? 0,
      hasPublishedResume: resume.data !== null,
    }
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Projects ------------------------------------------------------------- */

const ADMIN_PROJECT_COLUMNS =
  'id, slug, title, status, category, publication_state, visibility_mode, is_featured, sort_order, client_disclosed, updated_at' as const

/** FR-ADM-03 — the admin list shows every project, drafts included. */
export async function listAllProjects(): Promise<AdminProjectRow[]> {
  const context = 'admin.listAllProjects'
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(ADMIN_PROJECT_COLUMNS)
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return data
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * FR-ADM-06 — Draft / Published / Archived as one explicit control.
 *
 * `published_at` is not touched here: the `set_published_at` trigger owns it,
 * sets it on the FIRST publish only, and never clears it. Unpublishing and
 * republishing must not rewrite the original date, because that date is what
 * "newest first" ordering means.
 */
export async function setProjectPublicationState(
  id: string,
  state: PublicationState,
): Promise<void> {
  const context = 'admin.setProjectPublicationState'
  try {
    const { error } = await supabase
      .from('projects')
      .update({ publication_state: state })
      .eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function updateProject(id: string, patch: TablesUpdate<'projects'>): Promise<void> {
  const context = 'admin.updateProject'
  try {
    const { error } = await supabase.from('projects').update(patch).eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * AC-PROJ-4. Images, pipeline steps and technology links cascade with the row.
 *
 * MED-07 requires the storage objects to be removed BEFORE the row, because
 * deleting the row first orphans the files with nothing left pointing at them.
 * That flow arrives with Phase 14 (storage); until then a delete here can
 * leave objects behind, which R-09 already classes as a known operational
 * chore rather than a bug.
 */
export async function deleteProject(id: string): Promise<void> {
  const context = 'admin.deleteProject'
  try {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Messages ------------------------------------------------------------- */

export async function listMessages(status?: MessageStatus): Promise<ContactMessage[]> {
  const context = 'admin.listMessages'
  try {
    let query = supabase
      .from('contact_messages')
      .select(
        'id, name, email, company, subject, message, service_type, status, source_page, admin_notes, created_at, read_at, replied_at',
      )
      .order('created_at', { ascending: false })
      .limit(200)

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      company: row.company,
      subject: row.subject,
      message: row.message,
      serviceType: row.service_type,
      status: row.status,
      sourcePage: row.source_page,
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      readAt: row.read_at,
      repliedAt: row.replied_at,
    }))
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * J-05 — opening a message auto-marks it read; replying and archiving are
 * explicit. The timestamps are set alongside the status so the inbox can show
 * "replied 2 days ago" without a second table.
 */
export async function setMessageStatus(id: string, status: MessageStatus): Promise<void> {
  const context = 'admin.setMessageStatus'
  try {
    const patch: TablesUpdate<'contact_messages'> = { status }
    if (status === 'read') patch.read_at = new Date().toISOString()
    if (status === 'replied') patch.replied_at = new Date().toISOString()

    const { error } = await supabase.from('contact_messages').update(patch).eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function deleteMessage(id: string): Promise<void> {
  const context = 'admin.deleteMessage'
  try {
    const { error } = await supabase.from('contact_messages').delete().eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}
