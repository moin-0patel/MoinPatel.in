import { describe, expect, it } from 'vitest'

import { CHAPTER_RANGES, CHAPTERS, chapterNumber, chapterProgress } from '@/lib/chapters'

/**
 * The scroll allocation is the contract between `docs/motion-spec.md` and the
 * Phase 4 timeline. Prose cannot be tested; this can.
 *
 * What is asserted is shape, not taste. Whether chapter 04 deserves 26% of the
 * scroll is a judgement the document argues for and only the running site can
 * settle. Whether the ranges tile 0→1 without a gap or an overlap is a fact — and
 * getting it wrong produces a stretch of scrolling where nothing is choreographed
 * at all, which looks like a broken page rather than a design decision.
 */
describe('chapter scroll allocation', () => {
  it('has exactly one range per chapter, in narrative order', () => {
    expect(CHAPTER_RANGES.map((range) => range.chapter)).toEqual([...CHAPTERS])
  })

  it('starts at 0 and ends at 1', () => {
    expect(CHAPTER_RANGES[0]?.start).toBe(0)
    expect(CHAPTER_RANGES.at(-1)?.end).toBe(1)
  })

  it('is contiguous — no gap and no overlap between chapters', () => {
    for (let i = 1; i < CHAPTER_RANGES.length; i++) {
      // Compared exactly rather than with a tolerance: these are authored
      // constants, not computed floats, so "close enough" would only hide a typo.
      expect(CHAPTER_RANGES[i]?.start).toBe(CHAPTER_RANGES[i - 1]?.end)
    }
  })

  it('gives every chapter a non-zero span', () => {
    for (const range of CHAPTER_RANGES) {
      expect(range.end).toBeGreaterThan(range.start)
    }
  })

  it('gives the projects chapter the widest span', () => {
    // Storyboard §04: the work "should receive the most attention". Encoded so
    // that rebalancing the other chapters cannot quietly demote it.
    const spans = CHAPTER_RANGES.map((range) => ({
      chapter: range.chapter,
      span: range.end - range.start,
    }))
    const widest = spans.reduce((a, b) => (b.span > a.span ? b : a))
    expect(widest.chapter).toBe('projects')
  })
})

describe('chapterProgress', () => {
  it('reports 0 at the start of a chapter and 1 at its end', () => {
    expect(chapterProgress(0.46, 'projects')).toBe(0)
    expect(chapterProgress(0.72, 'projects')).toBe(1)
  })

  it('interpolates linearly within a chapter', () => {
    expect(chapterProgress(0.59, 'projects')).toBeCloseTo(0.5, 5)
  })

  it('clamps outside the chapter so consumers need no bounds guard', () => {
    expect(chapterProgress(0, 'projects')).toBe(0)
    expect(chapterProgress(1, 'projects')).toBe(1)
  })
})

describe('chapterNumber', () => {
  it('is 1-based and zero-padded', () => {
    expect(chapterNumber('hero')).toBe('01')
    expect(chapterNumber('contact')).toBe('07')
  })
})
