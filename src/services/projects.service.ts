import { reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
import type { Json } from '@/types/database.types'
import type {
  PipelineStep,
  Project,
  ProjectFilters,
  ProjectImage,
  ProjectSummary,
  ProjectTechnology,
} from '@/types/domain'

/**
 * Projects service — PRD 31.3.
 *
 * The only module that queries project data. Rules applied throughout:
 *
 * API-01  Explicit column lists, never select('*'). `projects` holds
 *         `confidentiality_note` and `client_name`; a wildcard would ship both
 *         to the browser on every card render, and adding an internal column
 *         later would leak it silently.
 * API-02  Public queries repeat the publication/visibility predicate even
 *         though RLS enforces it. FE-05: the duplication is intentional
 *         defence, not redundancy to be cleaned up.
 * API-04  Errors are logged with context and re-thrown as typed AppErrors.
 * API-06  Every list applies an explicit limit.
 */

/** Hard ceiling on any public list. FR-PROJ-09 adds paging past this. */
const PUBLIC_LIST_LIMIT = 48

/** API-01 — the exact columns a case study may expose. */
const PROJECT_DETAIL_COLUMNS = `
  id, slug, title, subtitle, summary,
  description_md, problem_md, solution_md, how_it_works_md, architecture_md,
  business_impact_md, challenges_md, lessons_md, role_description,
  status, category, visibility_mode, is_featured,
  started_on, completed_on,
  cover_image_path, cover_image_alt,
  github_url, live_url, video_url,
  client_name, client_disclosed,
  seo_title, seo_description, og_image_path,
  published_at, updated_at
` as const
// Deliberately absent: confidentiality_note (admin-only, 23.2), view_count,
// publication_state (the row would not be here if it were not published).

const VIEW_COLUMNS = `
  id, slug, title, subtitle, summary,
  status, category, visibility_mode, is_featured, sort_order,
  started_on, completed_on,
  cover_image_path, cover_image_alt,
  github_url, live_url,
  published_at, updated_at,
  technologies
` as const

/* ---------------------------------------------------------------------------
 * Row shapes returned by the queries above.
 * ------------------------------------------------------------------------- */

type ViewRow = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  summary: string
  status: ProjectSummary['status']
  category: ProjectSummary['category']
  visibility_mode: ProjectSummary['visibilityMode']
  is_featured: boolean
  sort_order: number
  started_on: string | null
  completed_on: string | null
  cover_image_path: string | null
  cover_image_alt: string | null
  github_url: string | null
  live_url: string | null
  published_at: string | null
  updated_at: string
  technologies: Json
}

type EmbeddedTechnology = {
  id: string
  name: string
  slug: string
  category: ProjectTechnology['category']
  icon_key: string | null
  color_hex: string | null
  tech_role: ProjectTechnology['role']
}

/* ---------------------------------------------------------------------------
 * Mappers — raw row in, domain type out (FE-02).
 * ------------------------------------------------------------------------- */

/**
 * The view aggregates technologies as JSON, so it arrives untyped. Parsing
 * defensively rather than casting keeps a malformed aggregate from crashing a
 * whole page render.
 */
function mapTechnologies(value: Json): ProjectTechnology[] {
  if (!Array.isArray(value)) return []
  const result: ProjectTechnology[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue
    const t = entry as Partial<EmbeddedTechnology>
    if (typeof t.id !== 'string' || typeof t.name !== 'string' || typeof t.slug !== 'string') {
      continue
    }
    result.push({
      id: t.id,
      name: t.name,
      slug: t.slug,
      category: t.category ?? 'other',
      iconKey: t.icon_key ?? null,
      colorHex: t.color_hex ?? null,
      websiteUrl: null, // not carried by the view; not needed on a card
      role: t.tech_role ?? 'primary',
    })
  }
  return result
}

function mapSummary(row: ViewRow): ProjectSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    status: row.status,
    category: row.category,
    visibilityMode: row.visibility_mode,
    isFeatured: row.is_featured,
    startedOn: row.started_on,
    completedOn: row.completed_on,
    coverImagePath: row.cover_image_path,
    coverImageAlt: row.cover_image_alt,
    githubUrl: row.github_url,
    liveUrl: row.live_url,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    technologies: mapTechnologies(row.technologies),
  }
}

/* ---------------------------------------------------------------------------
 * Public reads
 * ------------------------------------------------------------------------- */

/**
 * FR-PROJ-01 — every published, non-private project, ordered
 * `is_featured desc, sort_order asc, published_at desc`.
 *
 * Category and status filters run in SQL. The technology filter runs in memory
 * because it targets the JSON aggregate the view produces; at this content
 * volume (well under the 48-row ceiling) that is cheaper than the join it
 * would otherwise take, and it keeps one round trip instead of two.
 */
export async function listPublishedProjects(
  filters: ProjectFilters = {},
): Promise<ProjectSummary[]> {
  const context = 'projects.listPublishedProjects'
  try {
    let query = supabase
      .from('v_public_projects')
      .select(VIEW_COLUMNS)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(PUBLIC_LIST_LIMIT)

    if (filters.categories?.length) query = query.in('category', filters.categories)
    if (filters.statuses?.length) query = query.in('status', filters.statuses)

    const { data, error } = await query
    if (error) throw error

    let projects = (data as ViewRow[]).map(mapSummary)

    if (filters.technologySlugs?.length) {
      const wanted = new Set(filters.technologySlugs)
      projects = projects.filter((p) => p.technologies.some((t) => wanted.has(t.slug)))
    }

    return projects
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * FR-HOME-06 — up to three featured projects for the homepage.
 *
 * The empty-state fallback (12.6) lives here rather than in the section
 * component: if nothing is featured, the three most recent published projects
 * stand in, so the homepage proves the claims either way.
 */
export async function listFeaturedProjects(limit = 3): Promise<ProjectSummary[]> {
  const context = 'projects.listFeaturedProjects'
  try {
    const { data, error } = await supabase
      .from('v_public_projects')
      .select(VIEW_COLUMNS)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (error) throw error

    const featured = (data as ViewRow[]).map(mapSummary)
    if (featured.length > 0) return featured

    const { data: recent, error: recentError } = await supabase
      .from('v_public_projects')
      .select(VIEW_COLUMNS)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (recentError) throw recentError

    return (recent as ViewRow[]).map(mapSummary)
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * FR-CASE-01 — fetch a case study by slug.
 *
 * Returns `null` for both "no such project" and "exists but is a draft".
 * AC-PROJ-8 and SEC-11 require those to be indistinguishable: a different
 * response for a draft slug would confirm the draft exists, which is exactly
 * the enumeration signal the PRD forbids. RLS produces the same zero rows for
 * both, and this function preserves that.
 */
export async function getPublishedProjectBySlug(slug: string): Promise<Project | null> {
  const context = 'projects.getPublishedProjectBySlug'
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(PROJECT_DETAIL_COLUMNS)
      .eq('slug', slug)
      .eq('publication_state', 'published') // API-02
      .neq('visibility_mode', 'private')
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const [images, steps, technologies] = await Promise.all([
      listProjectImages(data.id),
      listPipelineSteps(data.id),
      listProjectTechnologies(data.id),
    ])

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle,
      summary: data.summary,
      status: data.status,
      category: data.category,
      visibilityMode: data.visibility_mode,
      isFeatured: data.is_featured,
      startedOn: data.started_on,
      completedOn: data.completed_on,
      coverImagePath: data.cover_image_path,
      coverImageAlt: data.cover_image_alt,
      githubUrl: data.github_url,
      liveUrl: data.live_url,
      videoUrl: data.video_url,
      publishedAt: data.published_at,
      updatedAt: data.updated_at,
      descriptionMd: data.description_md,
      problemMd: data.problem_md,
      solutionMd: data.solution_md,
      howItWorksMd: data.how_it_works_md,
      architectureMd: data.architecture_md,
      businessImpactMd: data.business_impact_md,
      challengesMd: data.challenges_md,
      lessonsMd: data.lessons_md,
      roleDescription: data.role_description,
      // FR-PROJ-16: the name only survives the mapper when disclosure is
      // explicitly granted. Undisclosed becomes null here, so no downstream
      // component can render it even by accident.
      clientName: data.client_disclosed ? data.client_name : null,
      seoTitle: data.seo_title,
      seoDescription: data.seo_description,
      ogImagePath: data.og_image_path,
      images,
      pipelineSteps: steps,
      technologies,
    }
  } catch (cause) {
    throw reportError(cause, context)
  }
}

async function listProjectImages(projectId: string): Promise<ProjectImage[]> {
  const { data, error } = await supabase
    .from('project_images')
    .select('id, storage_path, alt_text, caption, role, width, height')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .limit(40)
  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    storagePath: row.storage_path,
    altText: row.alt_text,
    caption: row.caption,
    role: row.role,
    width: row.width,
    height: row.height,
  }))
}

async function listPipelineSteps(projectId: string): Promise<PipelineStep[]> {
  const { data, error } = await supabase
    .from('project_pipeline_steps')
    .select('id, step_number, label, description, tech_note, icon_key')
    .eq('project_id', projectId)
    .order('step_number', { ascending: true })
    .limit(30)
  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    stepNumber: row.step_number,
    label: row.label,
    description: row.description,
    techNote: row.tech_note,
    iconKey: row.icon_key,
  }))
}

async function listProjectTechnologies(projectId: string): Promise<ProjectTechnology[]> {
  const { data, error } = await supabase
    .from('project_technologies')
    .select(
      'tech_role, sort_order, technologies!inner(id, name, slug, category, icon_key, color_hex, website_url, published)',
    )
    .eq('project_id', projectId)
    .eq('technologies.published', true)
    .order('sort_order', { ascending: true })
    .limit(40)
  if (error) throw error

  return data.map((row) => ({
    id: row.technologies.id,
    name: row.technologies.name,
    slug: row.technologies.slug,
    category: row.technologies.category,
    iconKey: row.technologies.icon_key,
    colorHex: row.technologies.color_hex,
    websiteUrl: row.technologies.website_url,
    role: row.tech_role,
  }))
}

/**
 * FR-CASE-08 — the next published project by sort order, wrapping to the
 * first. Never the current project, and never a non-published one.
 *
 * The wrap is why this reads the ordered slug list rather than asking SQL for
 * "the next row": "next, but wrap, and skip myself" has no clean single-query
 * form, and the list is small enough that ordering it is free.
 */
export async function getNextProject(currentSlug: string): Promise<ProjectSummary | null> {
  const context = 'projects.getNextProject'
  try {
    const { data, error } = await supabase
      .from('v_public_projects')
      .select(VIEW_COLUMNS)
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(PUBLIC_LIST_LIMIT)
    if (error) throw error

    const rows = data as ViewRow[]
    // Only projects that actually have a case-study page are valid targets.
    const candidates = rows.filter(
      (r) => r.visibility_mode === 'full' || r.visibility_mode === 'case_study_only',
    )
    if (candidates.length <= 1) return null

    const index = candidates.findIndex((r) => r.slug === currentSlug)
    if (index === -1) return null

    const next = candidates[(index + 1) % candidates.length]
    if (!next || next.slug === currentSlug) return null

    return mapSummary(next)
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * P2 — the only permitted mutation path for `view_count`. anon holds no UPDATE
 * grant on `projects`, so this RPC is the entire surface (23.19).
 *
 * A failure here is swallowed on purpose: a view counter must never break the
 * page a visitor came to read.
 */
export async function incrementProjectView(slug: string): Promise<void> {
  try {
    await supabase.rpc('increment_project_view', { p_slug: slug })
  } catch (cause) {
    reportError(cause, 'projects.incrementProjectView')
  }
}
