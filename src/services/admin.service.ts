import { reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'
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

/* --- Project editor ------------------------------------------------------- */

/** Every column the editor needs, drafts included. Admin-only fields present. */
const EDITOR_COLUMNS = `
  id, slug, title, subtitle, summary,
  description_md, problem_md, solution_md, how_it_works_md, architecture_md,
  business_impact_md, challenges_md, lessons_md, role_description,
  status, category, publication_state, visibility_mode,
  is_featured, sort_order, started_on, completed_on,
  cover_image_path, cover_image_alt,
  github_url, live_url, video_url,
  client_name, client_disclosed, confidentiality_note,
  seo_title, seo_description, og_image_path
` as const

export type EditorProject = {
  project: Tables<'projects'>
  technologyIds: string[]
  pipelineSteps: Tables<'project_pipeline_steps'>[]
  images: Tables<'project_images'>[]
}

export async function getProjectForEdit(id: string): Promise<EditorProject | null> {
  const context = 'admin.getProjectForEdit'
  try {
    const [project, techs, steps, images] = await Promise.all([
      supabase.from('projects').select(EDITOR_COLUMNS).eq('id', id).maybeSingle(),
      supabase.from('project_technologies').select('technology_id').eq('project_id', id),
      supabase
        .from('project_pipeline_steps')
        .select('*')
        .eq('project_id', id)
        .order('step_number', { ascending: true }),
      supabase
        .from('project_images')
        .select('*')
        .eq('project_id', id)
        .order('sort_order', { ascending: true }),
    ])

    for (const result of [project, techs, steps, images]) {
      if (result.error) throw result.error
    }
    if (!project.data) return null

    return {
      project: project.data as Tables<'projects'>,
      technologyIds: techs.data?.map((row) => row.technology_id) ?? [],
      pipelineSteps: steps.data ?? [],
      images: images.data ?? [],
    }
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/** AC-PROJ-2 — uniqueness is checked before save, not discovered by a 23505. */
export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const context = 'admin.isSlugAvailable'
  try {
    let query = supabase.from('projects').select('id').eq('slug', slug).limit(1)
    if (excludeId) query = query.neq('id', excludeId)
    const { data, error } = await query
    if (error) throw error
    return (data?.length ?? 0) === 0
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function createProject(values: TablesInsert<'projects'>): Promise<string> {
  const context = 'admin.createProject'
  try {
    // The id is needed to attach technologies and pipeline steps next, so this
    // is the one place a select-after-insert is worth the round trip.
    const { data, error } = await supabase.from('projects').insert(values).select('id').single()
    if (error) throw error
    return data.id
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * Replace a project's technology links.
 *
 * Delete-then-insert rather than a diff: the join table has no data of its own
 * beyond `tech_role` and `sort_order`, both of which are being rewritten
 * anyway, so a diff would be more code for an identical result.
 */
export async function setProjectTechnologies(
  projectId: string,
  technologyIds: string[],
): Promise<void> {
  const context = 'admin.setProjectTechnologies'
  try {
    const { error: deleteError } = await supabase
      .from('project_technologies')
      .delete()
      .eq('project_id', projectId)
    if (deleteError) throw deleteError

    if (technologyIds.length === 0) return

    const { error } = await supabase.from('project_technologies').insert(
      technologyIds.map((technology_id, index) => ({
        project_id: projectId,
        technology_id,
        sort_order: index,
      })),
    )
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * Replace a project's pipeline steps.
 *
 * `step_number` is reassigned from the array index, so reordering in the UI is
 * just reordering the array — and the (project_id, step_number) UNIQUE
 * constraint can never be violated by a partial swap.
 */
export async function setPipelineSteps(
  projectId: string,
  steps: { label: string; description: string | null; techNote: string | null }[],
): Promise<void> {
  const context = 'admin.setPipelineSteps'
  try {
    const { error: deleteError } = await supabase
      .from('project_pipeline_steps')
      .delete()
      .eq('project_id', projectId)
    if (deleteError) throw deleteError

    const populated = steps.filter((step) => step.label.trim() !== '')
    if (populated.length === 0) return

    const { error } = await supabase.from('project_pipeline_steps').insert(
      populated.map((step, index) => ({
        project_id: projectId,
        step_number: index + 1,
        label: step.label.trim(),
        description: step.description?.trim() || null,
        tech_note: step.techNote?.trim() || null,
      })),
    )
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/** The technology picker's options, including unpublished ones (admin view). */
export async function listAllTechnologies(): Promise<Tables<'technologies'>[]> {
  const context = 'admin.listAllTechnologies'
  try {
    const { data, error } = await supabase
      .from('technologies')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })
      .limit(200)
    if (error) throw error
    return data
  } catch (cause) {
    throw reportError(cause, context)
  }
}
