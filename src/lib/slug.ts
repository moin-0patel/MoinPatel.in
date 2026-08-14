/**
 * Slug generation and validation — PRD 13.3, tested per 41.1.
 *
 * The pattern here must stay identical to the `projects_slug_check` CHECK
 * constraint in 20260815090300_create_project_tables.sql. If they drift, the
 * admin form will happily accept a slug the database then rejects, and the
 * user sees a generic save failure with no field to fix.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const SLUG_MIN_LENGTH = 3
export const SLUG_MAX_LENGTH = 80

/**
 * Derive a slug from a title. Diacritics are folded rather than stripped, so
 * "Café" becomes "cafe" and not "caf".
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining marks left by NFKD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '') // the slice may have left a trailing hyphen
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= SLUG_MIN_LENGTH && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug)
}

/**
 * Resolve a collision by suffixing -2, -3, … The suffix is appended within the
 * length limit rather than beyond it, so the result is always storable.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const existing = new Set(Array.from(taken, (s) => s.toLowerCase()))
  const root = slugify(base)
  if (!existing.has(root)) return root

  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`
    const candidate = `${root.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/g, '')}${suffix}`
    if (!existing.has(candidate)) return candidate
  }
  throw new Error(`Could not find a free slug for "${base}" after 998 attempts.`)
}
