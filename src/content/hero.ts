/**
 * Hero fallback copy — PRD 12.12 "Loading".
 *
 * The identity lines are server-independent, so they render immediately from
 * here and are replaced the moment the `profiles` query resolves. This avoids
 * a spinner in the hero and, more importantly, avoids the layout shift of an
 * empty h1 growing into a full one (PERF-03).
 *
 * These are the only hard-coded content values on the public site. Everything
 * else is a database row (Principle 5). They exist because a hero that flashes
 * blank is worse than a hero that briefly shows the correct, approved text.
 *
 * If any of these ever disagrees with the `profiles` row, the row is right and
 * this file is the defect.
 */
export const HERO_FALLBACK = {
  fullName: 'Moin Patel',
  // Fallback only — shown while the profile query is in flight. Kept in step
  // with profiles.role_title so a slow network cannot flash a stale title.
  // The database remains the source of truth.
  roleTitle: 'AI Developer & Automation Engineer',
  // Approved, verbatim (PRD 2, 8.3).
  positioningLine:
    'Building AI-powered systems that automate work, save time, and reduce business costs.',
  location: 'Surat, Gujarat, India',
} as const
