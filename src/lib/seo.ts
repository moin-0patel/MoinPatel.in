import { absoluteUrl } from './env'

/**
 * SEO helpers — PRD 29.1 lists `lib/seo.ts` as the home for this logic.
 *
 * Kept out of the <SEO> component so the component file exports only a
 * component (which is also what keeps Fast Refresh working), and so the
 * prerender step in Phase 15 can reuse these without importing React.
 */

/** SEO-01 / A11Y-15 — unique, descriptive page titles. */
export function pageTitle(pageName?: string): string {
  const base = 'Moin Patel — AI Developer & AI Automation Executive'
  return pageName ? `${pageName} · Moin Patel` : base
}

/** SEO-05 — canonical URLs are absolute and query-free. */
export function canonicalUrl(path: string): string {
  return absoluteUrl(path.split('?')[0]?.split('#')[0] ?? '/')
}

/** SEO-02 — project metadata falls back to title/summary when unset. */
export function projectMeta(project: {
  title: string
  summary: string
  seoTitle: string | null
  seoDescription: string | null
}): { title: string; description: string } {
  return {
    title: pageTitle(project.seoTitle ?? project.title),
    description: project.seoDescription ?? project.summary,
  }
}
