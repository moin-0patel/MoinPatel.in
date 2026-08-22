/**
 * The seven-chapter narrative — spec §2.
 *
 * Constants live here rather than beside the Chapter components so that file
 * exports components only. Mixing the two breaks React Fast Refresh, which the
 * lint rule flags: editing a constant would force a full reload instead of a
 * hot update, and during Phase 4's animation work that is the difference
 * between iterating and waiting.
 *
 * The order IS the narrative. Changing it changes the story, and
 * `useScrollProgress` derives the active chapter from this array.
 */

export const CHAPTERS = [
  'hero',
  'introduction',
  'capabilities',
  'projects',
  'process',
  'about',
  'contact',
] as const

export type ChapterId = (typeof CHAPTERS)[number]

/** 1-indexed and zero-padded: 01…07. */
export function chapterNumber(id: ChapterId): string {
  return String(CHAPTERS.indexOf(id) + 1).padStart(2, '0')
}

/**
 * Scroll allocation — the motion spec's single source of truth.
 *
 * Each chapter owns a contiguous slice of normalized document progress. This
 * lives in code rather than only in `docs/motion-spec.md` for one reason: a
 * choreography table that exists only in prose drifts from the implementation
 * silently, and the drift is invisible until the animation looks wrong. The
 * document explains WHY these numbers; this array is what actually runs, and
 * `verify:ui` asserts the two agree in shape (contiguous, 0→1, one entry per
 * chapter).
 *
 * Chapter 04 is deliberately the widest. Storyboard §04: projects "should
 * receive the most attention", and three project destinations need room to
 * travel between rather than cut.
 *
 * Chapter 01 is short because its opening beats are TIME-based, not scroll-
 * based — the load sequence runs on a clock before the user scrolls at all.
 * See the motion spec's "Load sequence" section.
 *
 * PHASE 1/PLANNING SCOPE: nothing consumes these yet. Phase 4 maps
 * `useScrollProgress().progress` onto them to drive the GSAP timeline.
 */
export type ChapterRange = {
  readonly chapter: ChapterId
  /** Inclusive start, normalized 0–1. */
  readonly start: number
  /** Exclusive end, normalized 0–1. */
  readonly end: number
}

export const CHAPTER_RANGES: readonly ChapterRange[] = [
  { chapter: 'hero', start: 0.0, end: 0.12 },
  { chapter: 'introduction', start: 0.12, end: 0.28 },
  { chapter: 'capabilities', start: 0.28, end: 0.46 },
  { chapter: 'projects', start: 0.46, end: 0.72 },
  { chapter: 'process', start: 0.72, end: 0.86 },
  { chapter: 'about', start: 0.86, end: 0.95 },
  { chapter: 'contact', start: 0.95, end: 1.0 },
]

/**
 * Where the reader is inside a single chapter, 0–1.
 *
 * Chapter-local progress is what choreography actually needs: "the second of
 * four statement lines" is a fact about position within chapter 02, not about
 * position in the document. Returns 0 before the chapter and 1 after it, so a
 * consumer can interpolate without guarding for out-of-range input.
 */
export function chapterProgress(progress: number, chapter: ChapterId): number {
  const range = CHAPTER_RANGES.find((entry) => entry.chapter === chapter)
  if (!range) return 0
  const span = range.end - range.start
  if (span <= 0) return 0
  return Math.min(1, Math.max(0, (progress - range.start) / span))
}
