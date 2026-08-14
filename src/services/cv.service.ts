import { reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
import type { EducationRecord, ExperienceRecord, SkillGroup, SocialLink } from '@/types/domain'

/**
 * CV service — experience, skills, education and social links.
 *
 * These four resources are grouped in one module rather than four because they
 * share a single characteristic: each is a small, flat, ordered list read once
 * per page with no cross-resource logic. Splitting them would produce four
 * files of one function each. Projects, contact and resume stay separate —
 * they carry real behaviour.
 */

/* --- Experience ---------------------------------------------------------- */

/**
 * FR-EXP-01/03 — published experience, newest first, with responsibilities and
 * achievements as two separately labelled lists.
 *
 * One round trip via embedded selects (API-03). The RLS policy on
 * `experience_items` re-checks the parent's publication state, so an
 * unpublished role cannot leak its bullets through the embed.
 */
export async function listPublishedExperience(): Promise<ExperienceRecord[]> {
  const context = 'cv.listPublishedExperience'
  try {
    const { data, error } = await supabase
      .from('experience')
      .select(
        `id, company, company_url, role_title, employment_type, location,
         start_date, end_date, is_current, summary_md,
         experience_items(id, item_type, content, sort_order),
         experience_technologies(sort_order, technologies!inner(id, name, slug, category, icon_key, color_hex, website_url, published))`,
      )
      .eq('publication_state', 'published') // API-02
      .order('sort_order', { ascending: true })
      .order('start_date', { ascending: false })
      .limit(30)

    if (error) throw error

    return data.map((row) => {
      const items = [...row.experience_items].sort((a, b) => a.sort_order - b.sort_order)
      return {
        id: row.id,
        company: row.company,
        companyUrl: row.company_url,
        roleTitle: row.role_title,
        employmentType: row.employment_type,
        location: row.location,
        startDate: row.start_date,
        endDate: row.end_date,
        isCurrent: row.is_current,
        summaryMd: row.summary_md,
        responsibilities: items
          .filter((i) => i.item_type === 'responsibility')
          .map((i) => ({ id: i.id, content: i.content })),
        achievements: items
          .filter((i) => i.item_type === 'achievement')
          .map((i) => ({ id: i.id, content: i.content })),
        technologies: [...row.experience_technologies]
          .sort((a, b) => a.sort_order - b.sort_order)
          .filter((t) => t.technologies.published)
          .map((t) => ({
            id: t.technologies.id,
            name: t.technologies.name,
            slug: t.technologies.slug,
            category: t.technologies.category,
            iconKey: t.technologies.icon_key,
            colorHex: t.technologies.color_hex,
            websiteUrl: t.technologies.website_url,
          })),
      }
    })
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Skills -------------------------------------------------------------- */

/**
 * FR-SKILL-02 — skills grouped by category, category order then skill order.
 *
 * FR-SKILL-06: a category with zero published skills is dropped here rather
 * than rendered as an empty column.
 *
 * Note there is no proficiency value to select — the column does not exist
 * (FR-SKILL-03, AC-SKILL-3).
 */
export async function listSkillGroups(): Promise<SkillGroup[]> {
  const context = 'cv.listSkillGroups'
  try {
    const { data, error } = await supabase
      .from('skill_categories')
      .select(
        `id, name, slug, description, icon_key, sort_order,
         skills(id, name, slug, description, is_core, sort_order, published)`,
      )
      .eq('published', true) // API-02
      .order('sort_order', { ascending: true })
      .limit(20)

    if (error) throw error

    return data
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        iconKey: row.icon_key,
        skills: [...row.skills]
          .filter((s) => s.published)
          .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
          .map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            description: s.description,
            isCore: s.is_core,
          })),
      }))
      .filter((group) => group.skills.length > 0) // FR-SKILL-06
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Education ----------------------------------------------------------- */

/**
 * FR-EDU-01 — published education, ordered by sort_order then start_date desc.
 *
 * FR-EDU-04: `gradeLabel` survives the mapper only when it is populated AND
 * `show_grade` is true, so a grade cannot render by forgetting a check.
 */
export async function listPublishedEducation(): Promise<EducationRecord[]> {
  const context = 'cv.listPublishedEducation'
  try {
    const { data, error } = await supabase
      .from('education')
      .select(
        `id, institution, qualification, field_of_study, location,
         start_date, end_date, status, grade_label, show_grade, description`,
      )
      .eq('publication_state', 'published') // API-02
      .order('sort_order', { ascending: true })
      .order('start_date', { ascending: false, nullsFirst: false })
      .limit(20)

    if (error) throw error

    return data.map((row) => ({
      id: row.id,
      institution: row.institution,
      qualification: row.qualification,
      fieldOfStudy: row.field_of_study,
      location: row.location,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      gradeLabel: row.show_grade ? row.grade_label : null,
      description: row.description,
    }))
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Social links -------------------------------------------------------- */

/** FR-NAV-03 / 12.12 — published social links for the hero and footer. */
export async function listSocialLinks(): Promise<SocialLink[]> {
  const context = 'cv.listSocialLinks'
  try {
    const { data, error } = await supabase
      .from('social_links')
      .select('id, platform, label, url, icon_key, show_in_hero, show_in_footer')
      .eq('published', true) // API-02
      .order('sort_order', { ascending: true })
      .limit(20)

    if (error) throw error

    return data.map((row) => ({
      id: row.id,
      platform: row.platform,
      label: row.label,
      url: row.url,
      iconKey: row.icon_key,
      showInHero: row.show_in_hero,
      showInFooter: row.show_in_footer,
    }))
  } catch (cause) {
    throw reportError(cause, context)
  }
}
