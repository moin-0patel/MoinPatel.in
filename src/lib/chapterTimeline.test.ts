import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/chapters'
import {
  buildChapterBands,
  resolveChapter,
  type SectionMeasurement,
} from '@/lib/chapterTimeline'

/**
 * A homepage shaped like the real one: seven narrative sections, with the four
 * non-narrative blocks (Impact, Experience, Skills, Education) occupying a long
 * stretch between `about` and `contact`. That gap is the whole reason this
 * module exists, so every fixture has to contain it.
 */
const SECTIONS: SectionMeasurement[] = [
  { chapter: 'hero', top: 0, height: 900 },
  { chapter: 'introduction', top: 900, height: 700 },
  { chapter: 'capabilities', top: 1600, height: 1100 },
  { chapter: 'projects', top: 2700, height: 1400 },
  { chapter: 'process', top: 4100, height: 1000 },
  { chapter: 'about', top: 5100, height: 600 },
  // Impact + Experience + Skills + Education live here: 5700 -> 9200.
  { chapter: 'contact', top: 9200, height: 500 },
]
const VIEWPORT = 900
const MAX_SCROLL = 9700 - VIEWPORT

describe('buildChapterBands', () => {
  const bands = buildChapterBands(SECTIONS, VIEWPORT, MAX_SCROLL)

  it('produces one band per narrative section', () => {
    expect(bands.map((b) => b.chapter)).toEqual([...CHAPTERS])
  })

  it('never overlaps — two chapters are never active at one scroll position', () => {
    // A tall viewport can show two sections at once, so the naive bands do
    // overlap; this is the clamp that stops the scene flickering between them.
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i]!.enter, `${bands[i]!.chapter} starts before ${bands[i - 1]!.chapter} ends`)
        .toBeGreaterThanOrEqual(bands[i - 1]!.exit)
    }
  })

  it('gives every band a non-zero width', () => {
    for (const band of bands) {
      expect(band.exit, band.chapter).toBeGreaterThan(band.enter)
    }
  })

  it('stays inside the scrollable range', () => {
    for (const band of bands) {
      expect(band.enter).toBeGreaterThanOrEqual(0)
      expect(band.exit).toBeLessThanOrEqual(MAX_SCROLL)
    }
  })

  it('scales with the viewport rather than using fixed offsets', () => {
    // The same page on a phone must not produce the same pixel boundaries.
    const phone = buildChapterBands(SECTIONS, 844, MAX_SCROLL)
    const desktop = buildChapterBands(SECTIONS, 1200, MAX_SCROLL)
    const phoneIntro = phone.find((b) => b.chapter === 'introduction')!
    const desktopIntro = desktop.find((b) => b.chapter === 'introduction')!
    expect(phoneIntro.enter).not.toBe(desktopIntro.enter)
    // A taller viewport shows a section sooner, so its chapter starts earlier.
    expect(desktopIntro.enter).toBeLessThan(phoneIntro.enter)
  })

  it('handles an unmeasurable page without throwing', () => {
    expect(buildChapterBands([], VIEWPORT, MAX_SCROLL)).toEqual([])
    expect(buildChapterBands(SECTIONS, 0, MAX_SCROLL)).toEqual([])
  })

  it('recomputes when a section changes height', () => {
    // Requirement: reflow must recalculate. A section growing pushes every
    // later band down rather than leaving stale boundaries behind.
    const taller = SECTIONS.map((s) =>
      s.chapter === 'capabilities' ? { ...s, height: s.height + 600 } : s,
    )
    const shifted = buildChapterBands(taller, VIEWPORT, MAX_SCROLL + 600)
    const before = bands.find((b) => b.chapter === 'capabilities')!
    const after = shifted.find((b) => b.chapter === 'capabilities')!
    expect(after.exit).toBeGreaterThan(before.exit)
  })
})

describe('resolveChapter', () => {
  const bands = buildChapterBands(SECTIONS, VIEWPORT, MAX_SCROLL)
  const bandFor = (chapter: string) => bands.find((b) => b.chapter === chapter)!

  it('reports the first chapter at the top of the page', () => {
    expect(resolveChapter(bands, 0)).toMatchObject({ index: 0, local: 0 })
  })

  it('runs local progress 0 to 1 across a band', () => {
    const band = bandFor('capabilities')
    /*
     * Sampled just inside the band, not exactly on `enter`.
     *
     * Adjacent bands share a boundary once the overlap clamp has pushed one
     * onto the other, and the shared position resolves to the EARLIER chapter
     * at local 1. That is not an off-by-one: chapter N at local 1 and chapter
     * N+1 at local 0 are the same scene state, because CHAPTER_MOTION is
     * continuous. Asserting on the boundary itself would be asserting which of
     * two identical answers the loop happens to reach first.
     */
    expect(resolveChapter(bands, band.enter + 0.001)!.local).toBeCloseTo(0, 4)
    expect(resolveChapter(bands, (band.enter + band.exit) / 2)!.local).toBeCloseTo(0.5, 5)
    expect(resolveChapter(bands, band.exit)!.local).toBeCloseTo(1, 5)
    expect(resolveChapter(bands, band.enter + 0.001)!.index).toBe(CHAPTERS.indexOf('capabilities'))
  })

  it('holds the previous chapter’s end state across the non-narrative sections', () => {
    // The Impact/Experience/Skills/Education stretch. The spec gives these no
    // choreography, so the Core stays where chapter 06 left it rather than
    // being dragged through chapter 07 early.
    const aboutBand = bandFor('about')
    const contactBand = bandFor('contact')
    const midGap = (aboutBand.exit + contactBand.enter) / 2
    expect(contactBand.enter).toBeGreaterThan(aboutBand.exit)

    const held = resolveChapter(bands, midGap)!
    expect(held.index).toBe(CHAPTERS.indexOf('about'))
    expect(held.local).toBe(1)
    expect(held.holding).toBe(true)
  })

  it('is continuous — no state jump entering or leaving a hold', () => {
    /*
     * The property that makes holding safe: CHAPTER_MOTION is continuous, so
     * "chapter N at local 1" and "chapter N+1 at local 0" are the same state.
     * Sitting in a gap therefore cannot produce a visible step.
     */
    const aboutBand = bandFor('about')
    const contactBand = bandFor('contact')
    const justBefore = resolveChapter(bands, aboutBand.exit - 0.001)!
    const inGap = resolveChapter(bands, aboutBand.exit + 1)!
    const justAfter = resolveChapter(bands, contactBand.enter + 0.001)!

    expect(justBefore.local).toBeCloseTo(1, 3)
    expect(inGap.local).toBe(1)
    expect(justAfter.local).toBeCloseTo(0, 3)
    expect(justAfter.index).toBe(inGap.index + 1)
  })

  it('never leaves a scroll position unresolved', () => {
    for (let y = 0; y <= MAX_SCROLL; y += 25) {
      const resolved = resolveChapter(bands, y)
      expect(resolved, `unresolved at ${y}`).not.toBeNull()
      expect(resolved!.local).toBeGreaterThanOrEqual(0)
      expect(resolved!.local).toBeLessThanOrEqual(1)
    }
  })

  it('advances monotonically down the page', () => {
    // Scrolling forward must never move the timeline backwards.
    let previous = -1
    for (let y = 0; y <= MAX_SCROLL; y += 25) {
      const { index } = resolveChapter(bands, y)!
      expect(index).toBeGreaterThanOrEqual(previous)
      previous = index
    }
    expect(previous).toBe(CHAPTERS.length - 1)
  })

  it('returns null when the page could not be measured', () => {
    expect(resolveChapter([], 100)).toBeNull()
  })
})
