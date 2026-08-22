import { describe, expect, it } from 'vitest'

import { findClearScreenPosition, type ScreenRect } from '@/lib/coreFraming'

const VIEWPORT = { width: 1280, height: 900 }
const RADIUS = 180
const MARGIN = 8

/** A text column down the left, as most of the homepage's chapters lay out. */
const LEFT_COLUMN: ScreenRect[] = [{ x: 64, y: 200, width: 650, height: 500 }]

/** Full-width copy with clear space above and below it. */
const CENTRE_BAND: ScreenRect[] = [{ x: 0, y: 350, width: 1280, height: 260 }]

describe('findClearScreenPosition', () => {
  it('leaves the choreography alone when nothing is in the way', () => {
    const preferred = { x: 0.5, y: 0.5 }
    const result = findClearScreenPosition([], VIEWPORT, RADIUS, preferred, MARGIN)
    expect(result.x).toBeCloseTo(0.5, 5)
    expect(result.y).toBeCloseTo(0.5, 5)
  })

  it('moves the Core clear of a left-hand text column', () => {
    const result = findClearScreenPosition(
      LEFT_COLUMN,
      VIEWPORT,
      RADIUS,
      { x: 0.5, y: 0.5 },
      MARGIN,
    )
    // The column ends at x=714; the Core's left edge must clear it.
    expect(result.x * VIEWPORT.width - RADIUS).toBeGreaterThanOrEqual(700)
  })

  it('moves vertically when the text spans the full width', () => {
    /*
     * Nowhere to go sideways, so the answer has to be above or below the band.
     *
     * Deliberately a smaller Core than the other cases. At radius 180 a 260px
     * band in a 900px viewport leaves no fully-clear position at all — the
     * containment clamp allows y between 188 and 712, and clearing the band
     * needs y <= 170 or y >= 790. The first version of this test asserted full
     * clearance at that radius and failed, which was the test demanding
     * something geometrically impossible rather than the search misbehaving.
     * A radius that CAN fit is what makes the assertion mean anything.
     */
    const radius = 100
    const result = findClearScreenPosition(
      CENTRE_BAND,
      VIEWPORT,
      radius,
      { x: 0.5, y: 0.5 },
      MARGIN,
    )
    const top = result.y * VIEWPORT.height - radius
    const bottom = result.y * VIEWPORT.height + radius
    expect(bottom <= 350 || top >= 610).toBe(true)
  })

  it('returns the least-bad position when nothing can fully clear', () => {
    // The Core is too big to escape a full-width band. It must still move as
    // far off the text as the viewport allows rather than giving up and
    // sitting in the middle of it.
    const result = findClearScreenPosition(
      CENTRE_BAND,
      VIEWPORT,
      RADIUS,
      { x: 0.5, y: 0.5 },
      MARGIN,
    )
    const centre = result.y * VIEWPORT.height
    expect(Math.abs(centre - 480)).toBeGreaterThan(100)
  })

  it('keeps the whole silhouette on screen', () => {
    for (const preferred of [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0.5, y: 0.5 },
    ]) {
      const result = findClearScreenPosition(LEFT_COLUMN, VIEWPORT, RADIUS, preferred, MARGIN)
      expect(result.x * VIEWPORT.width - RADIUS).toBeGreaterThanOrEqual(MARGIN - 0.5)
      expect(result.x * VIEWPORT.width + RADIUS).toBeLessThanOrEqual(VIEWPORT.width - MARGIN + 0.5)
      expect(result.y * VIEWPORT.height - RADIUS).toBeGreaterThanOrEqual(MARGIN - 0.5)
      expect(result.y * VIEWPORT.height + RADIUS).toBeLessThanOrEqual(
        VIEWPORT.height - MARGIN + 0.5,
      )
    }
  })

  it('prefers the position nearest the choreography among equally clear ones', () => {
    // Both sides of the band are free; the one matching the nominal x wins, so
    // chapter 04's lateral stations still read as lateral.
    const left = findClearScreenPosition(CENTRE_BAND, VIEWPORT, RADIUS, { x: 0.2, y: 0.5 }, MARGIN)
    const right = findClearScreenPosition(CENTRE_BAND, VIEWPORT, RADIUS, { x: 0.8, y: 0.5 }, MARGIN)
    expect(left.x).toBeLessThan(right.x)
  })

  it('centres rather than bleeding asymmetrically when the Core cannot fit', () => {
    const tiny = { width: 200, height: 200 }
    const result = findClearScreenPosition(LEFT_COLUMN, tiny, RADIUS, { x: 0.1, y: 0.9 }, MARGIN)
    expect(result.x).toBeCloseTo(0.5, 5)
    expect(result.y).toBeCloseTo(0.5, 5)
  })

  it('is resolution independent — the same layout gives the same normalised answer', () => {
    const scale = 2
    const scaled = LEFT_COLUMN.map((r) => ({
      x: r.x * scale,
      y: r.y * scale,
      width: r.width * scale,
      height: r.height * scale,
    }))
    const a = findClearScreenPosition(LEFT_COLUMN, VIEWPORT, RADIUS, { x: 0.5, y: 0.5 }, MARGIN)
    const b = findClearScreenPosition(
      scaled,
      { width: VIEWPORT.width * scale, height: VIEWPORT.height * scale },
      RADIUS * scale,
      { x: 0.5, y: 0.5 },
      MARGIN * scale,
    )
    expect(b.x).toBeCloseTo(a.x, 5)
    expect(b.y).toBeCloseTo(a.y, 5)
  })

  describe('bottom bleed', () => {
    // A Core too large to clear a heading band while staying contained — the
    // chapter 03 situation, where the heading sits at the top of the viewport
    // and the object is wider than the gap beneath it.
    const HEADING: ScreenRect[] = [{ x: 110, y: 160, width: 500, height: 130 }]
    const BIG = 400

    it('stays contained when it is not needed', () => {
      const contained = findClearScreenPosition(
        LEFT_COLUMN,
        VIEWPORT,
        RADIUS,
        { x: 0.5, y: 0.5 },
        MARGIN,
        'ifNeeded',
      )
      // A clear contained answer exists here, so permission to bleed changes
      // nothing — the licence is conditional, not a mode.
      const strict = findClearScreenPosition(
        LEFT_COLUMN,
        VIEWPORT,
        RADIUS,
        { x: 0.5, y: 0.5 },
        MARGIN,
        'never',
      )
      expect(contained).toEqual(strict)
    })

    it('never bleeds without permission', () => {
      const result = findClearScreenPosition(
        HEADING,
        VIEWPORT,
        BIG,
        { x: 0.5, y: 0.5 },
        MARGIN,
        'never',
      )
      expect(result.y * VIEWPORT.height + BIG).toBeLessThanOrEqual(VIEWPORT.height + 0.5)
    })

    it('drops past the bottom edge when that is the only way to clear the text', () => {
      const result = findClearScreenPosition(
        HEADING,
        VIEWPORT,
        BIG,
        { x: 0.5, y: 0.5 },
        MARGIN,
        'ifNeeded',
      )
      const cy = result.y * VIEWPORT.height
      // Cleared the heading...
      expect(cy - BIG).toBeGreaterThanOrEqual(290 - 0.5)
      // ...by going out of the bottom, which is the whole point.
      expect(cy + BIG).toBeGreaterThan(VIEWPORT.height)
    })

    it('crops only the bottom — never the top or either side', () => {
      const result = findClearScreenPosition(
        HEADING,
        VIEWPORT,
        BIG,
        { x: 0.5, y: 0.5 },
        MARGIN,
        'ifNeeded',
      )
      const cx = result.x * VIEWPORT.width
      const cy = result.y * VIEWPORT.height
      expect(cx - BIG, 'left edge').toBeGreaterThanOrEqual(MARGIN - 0.5)
      expect(cx + BIG, 'right edge').toBeLessThanOrEqual(VIEWPORT.width - MARGIN + 0.5)
      expect(cy - BIG, 'top edge').toBeGreaterThanOrEqual(MARGIN - 0.5)
    })

    it('keeps the centre on screen so at least half the Core stays visible', () => {
      const result = findClearScreenPosition(
        HEADING,
        VIEWPORT,
        BIG,
        { x: 0.5, y: 0.5 },
        MARGIN,
        'ifNeeded',
      )
      // Without this cap the search would clear the text by pushing the Core
      // out of sight, which solves contrast by deleting the composition.
      expect(result.y * VIEWPORT.height).toBeLessThanOrEqual(VIEWPORT.height + 0.5)
    })
  })

  it('reduces overlap compared with the nominal position it was given', () => {
    // The property that matters, stated directly: whatever it picks must be at
    // least as clear as leaving the Core where the spec put it.
    const preferred = { x: 0.5, y: 0.5 }
    const chosen = findClearScreenPosition(LEFT_COLUMN, VIEWPORT, RADIUS, preferred, MARGIN)

    const coverage = (point: { x: number; y: number }) => {
      const box = {
        x: point.x * VIEWPORT.width - RADIUS,
        y: point.y * VIEWPORT.height - RADIUS,
        width: RADIUS * 2,
        height: RADIUS * 2,
      }
      let total = 0
      for (const r of LEFT_COLUMN) {
        const w = Math.min(box.x + box.width, r.x + r.width) - Math.max(box.x, r.x)
        const h = Math.min(box.y + box.height, r.y + r.height) - Math.max(box.y, r.y)
        if (w > 0 && h > 0) total += w * h
      }
      return total
    }

    expect(coverage(chosen)).toBeLessThan(coverage(preferred))
  })
})
