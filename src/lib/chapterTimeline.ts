import { CHAPTERS, type ChapterId } from '@/lib/chapters'

/**
 * Chapter progress derived from where the sections actually are.
 *
 * WHY THIS REPLACED FIXED PERCENTAGES
 *
 * The first implementation read the motion spec's §1 table literally: chapter
 * 03 owns 28-46% of document progress, and so on. That is only correct if the
 * document is nothing but the seven chapters, and it is not — Impact,
 * Experience, Skills and Education sit between chapter 06 and chapter 07 and
 * account for a large share of the page.
 *
 * So the percentages drifted away from the sections they were named after. At
 * 30% document progress the timeline played chapter 03 — Core close, emissive
 * 2.4, the brightest state on the page — while the viewport was showing the
 * Impact section. Measured consequence: WCAG 1.4.3 failures at three separate
 * scroll bands, worst 1.06:1 against a 4.5:1 requirement, on text that had
 * never been designed to sit under a lit object.
 *
 * The fix is not new choreography. It is to stop guessing where the chapters
 * are and measure them.
 *
 * SEPARATED FROM THE DOM ON PURPOSE
 *
 * Everything here takes measurements as arguments and returns numbers. The
 * reading of the DOM lives in useChapterTimeline; the arithmetic that decides
 * which chapter is active lives here, where it can be tested without a browser
 * — see chapterTimeline.test.ts.
 */

export type SectionMeasurement = {
  readonly chapter: ChapterId
  /** Document-relative offset of the section's top, in pixels. */
  readonly top: number
  readonly height: number
}

export type ChapterBand = {
  readonly chapter: ChapterId
  /** Scroll position at which this chapter's local progress is 0. */
  readonly enter: number
  /** Scroll position at which it is 1. */
  readonly exit: number
}

/**
 * Where in the viewport a section's edges sit at the ends of its band.
 *
 * A chapter starts when its top is three-quarters of the way down the
 * viewport — far enough in to be worth choreographing, not so far that the
 * motion begins after the reader is already reading. It finishes when its
 * bottom passes the upper quarter, which is the point the section stops being
 * what anyone is looking at.
 *
 * Fractions of the viewport, never pixels: the same relationship has to hold on
 * an 844px phone and a 1440px desktop, and a pixel offset tuned for one is
 * wrong for the other.
 */
const ENTER_AT_VIEWPORT_FRACTION = 0.75
const EXIT_AT_VIEWPORT_FRACTION = 0.25

/**
 * Turn measured sections into a monotonic, non-overlapping set of scroll bands.
 *
 * Overlap is the thing to prevent. A tall viewport can show two chapters at
 * once, so the naive band for each section can start before the previous one
 * ends — and then two chapters are "active" at the same scroll position and the
 * last one evaluated wins, which reads as the scene flickering between states.
 * Each band is therefore pushed to start no earlier than the previous one
 * finished.
 *
 * The gaps that remain between bands are deliberate and are where the
 * non-narrative sections live. See resolveChapter for what happens in them.
 */
export function buildChapterBands(
  sections: readonly SectionMeasurement[],
  viewportHeight: number,
  maxScroll: number,
): ChapterBand[] {
  if (sections.length === 0 || viewportHeight <= 0) return []

  // Narrative order, not DOM order. They agree today; if a section is ever
  // moved, the timeline should follow the story rather than the markup.
  const ordered = [...sections].sort(
    (a, b) => CHAPTERS.indexOf(a.chapter) - CHAPTERS.indexOf(b.chapter),
  )

  const bands: ChapterBand[] = []
  let previousExit = 0

  for (const section of ordered) {
    const rawEnter = section.top - viewportHeight * ENTER_AT_VIEWPORT_FRACTION
    const rawExit = section.top + section.height - viewportHeight * EXIT_AT_VIEWPORT_FRACTION

    const enter = Math.min(Math.max(rawEnter, previousExit, 0), maxScroll)
    // A band must have width or its local progress divides by zero. One pixel
    // is enough: a section this short is never on screen alone anyway.
    const exit = Math.min(Math.max(rawExit, enter + 1), maxScroll)

    bands.push({ chapter: section.chapter, enter, exit })
    previousExit = exit
  }

  return bands
}

export type ResolvedChapter = {
  /** Index into CHAPTERS / CHAPTER_MOTION. */
  readonly index: number
  /** 0 at the chapter's entry, 1 at its exit. */
  readonly local: number
  /** True while the reader is between two chapters — see below. */
  readonly holding: boolean
}

/**
 * Which chapter owns this scroll position, and how far into it we are.
 *
 * THE GAPS BETWEEN BANDS HOLD THE PREVIOUS CHAPTER'S END STATE.
 *
 * Impact, Experience, Skills and Education are not chapters and the spec gives
 * them no choreography. Inventing some would be making up product; interpolating
 * the next chapter early would drag a bright, close Core across them, which is
 * exactly the failure this module exists to fix. So the scene simply holds
 * where the last chapter left it — chapter 06's end state, which the spec
 * itself describes as the quietest on the page.
 *
 * Holding is seamless rather than a freeze-frame, because CHAPTER_MOTION is
 * continuous by construction: chapter N+1 starts at chapter N's end state, and
 * chapters.test.ts asserts it. Sitting at "chapter N, local 1" for a while and
 * then beginning "chapter N+1, local 0" produces no discontinuity at all.
 */
export function resolveChapter(
  bands: readonly ChapterBand[],
  scrollY: number,
): ResolvedChapter | null {
  if (bands.length === 0) return null

  const first = bands[0]!
  if (scrollY <= first.enter) return { index: 0, local: 0, holding: false }

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]!

    if (scrollY <= band.exit) {
      const span = band.exit - band.enter
      const local = span <= 0 ? 1 : (scrollY - band.enter) / span
      return {
        index: CHAPTERS.indexOf(band.chapter),
        local: Math.min(1, Math.max(0, local)),
        holding: false,
      }
    }

    const next = bands[i + 1]
    if (!next || scrollY < next.enter) {
      // Past this chapter, not yet into the next: hold the end state.
      return { index: CHAPTERS.indexOf(band.chapter), local: 1, holding: true }
    }
  }

  const last = bands[bands.length - 1]!
  return { index: CHAPTERS.indexOf(last.chapter), local: 1, holding: true }
}
