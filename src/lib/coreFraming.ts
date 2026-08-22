/**
 * Where the Core is allowed to sit on screen, given where the words are.
 *
 * THE PROBLEM THIS SOLVES
 *
 * The motion spec points the camera at the world origin for most chapters, so
 * the Core lands dead centre — which is also where body copy lives. Measured
 * against composited pixels, text over the lit sphere fell to 1.57:1 against a
 * 4.5:1 requirement at thirteen of twenty-six sampled positions.
 *
 * The Phase 3 ruling settled how to answer that: move the Core, do not dim it.
 * This is that answer generalised from the hero to every chapter.
 *
 * HOW IT WORKS
 *
 * The choreography still decides where the Core WANTS to be — that is
 * `preferred`, projected from the spec's own camera. This finds the nearest
 * position to it that the text is not already occupying. When the viewport has
 * room, the answer is `preferred` itself and the choreography is untouched. It
 * only bites where the alternative was unreadable text.
 *
 * Pure and viewport-space: no DOM, no three.js, no pixels tied to one width.
 * Everything is normalised 0-1 so the same logic holds at 390 and 1920.
 */

export type ScreenRect = {
  /** Viewport-space pixels, origin top-left. */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export type NormalizedPoint = { readonly x: number; readonly y: number }

/**
 * How hard each consideration pulls.
 *
 * Overlap dominates by an order of magnitude: a position that keeps the Core
 * off the text is worth far more than one that keeps it near its nominal spot,
 * because the first is a legibility requirement and the second is composition.
 * The distance term only decides between positions that are equally clear, and
 * that is exactly the job it should have — without it the search would pick an
 * arbitrary clear corner and the Core would jump around between chapters.
 */
const OVERLAP_WEIGHT = 10
const DISTANCE_WEIGHT = 1

/** Candidate positions per axis. 17x13 is 221 probes — trivial arithmetic. */
const GRID_X: number = 17
const GRID_Y: number = 13

/**
 * Whether this chapter may let the Core run past the BOTTOM edge.
 *
 * 'ifNeeded' is a last resort and behaves exactly like 'never' whenever a fully
 * contained position can clear the text — the search only reaches for it when
 * containment and legibility cannot both be had.
 *
 * Bottom only, and the horizontal clamp is untouched. A disc cropped by one
 * horizontal edge stays symmetric about its vertical axis and reads as a form
 * rising out of frame; cropped at a side it reads as a mistake, which is what
 * the Phase 3 containment rule was written to prevent.
 */
export type BottomBleed = 'never' | 'ifNeeded'

/**
 * The centre never leaves the viewport, so at least half the Core's height is
 * always on screen. Without a cap the search would happily push it out of sight
 * entirely, which clears the text by deleting the composition.
 */
const MIN_CENTRE_ON_SCREEN = 1

function overlapArea(a: ScreenRect, b: ScreenRect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/**
 * The best screen position for the Core, as normalised viewport coordinates.
 *
 * `radiusPx` is the Core's on-screen radius including its wireframe shell — the
 * silhouette, not the sphere, because the shell is what actually overlaps text.
 */
export function findClearScreenPosition(
  textRects: readonly ScreenRect[],
  viewport: { width: number; height: number },
  radiusPx: number,
  preferred: NormalizedPoint,
  edgeMarginPx: number,
  bottomBleed: BottomBleed = 'never',
): NormalizedPoint {
  if (viewport.width <= 0 || viewport.height <= 0) return preferred

  /*
   * Stay wholly on screen — the Phase 3 containment rule, unchanged.
   *
   * When the Core is too large for the viewport to contain (a very small phone
   * during the closest approach), the clamp inverts. Centring is the honest
   * fallback: symmetric bleed reads as a deliberate crop, an asymmetric one
   * reads as a mistake.
   */
  const limit = (extent: number) => {
    const min = radiusPx + edgeMarginPx
    const max = extent - radiusPx - edgeMarginPx
    return min > max ? { min: extent / 2, max: extent / 2 } : { min, max }
  }
  const xLimit = limit(viewport.width)
  const yLimit = limit(viewport.height)

  const clampedPreferred = {
    x: Math.min(xLimit.max, Math.max(xLimit.min, preferred.x * viewport.width)),
    y: Math.min(yLimit.max, Math.max(yLimit.min, preferred.y * viewport.height)),
  }

  // Nothing on screen to avoid: the choreography gets exactly what it asked for.
  if (textRects.length === 0) {
    return { x: clampedPreferred.x / viewport.width, y: clampedPreferred.y / viewport.height }
  }

  /*
   * Overlap is measured against the TEXT's area, not the Core's.
   *
   * It was the Core's, and that made the metric useless exactly when it
   * mattered most. During chapter 03 the Core is ~1080px across, so burying the
   * entire section description scored 0.02 — a rounding error beside the
   * distance term, and the search cheerfully sat on the text rather than move.
   * Normalising by the text says what a reader would: covering all of a
   * paragraph is a complete failure whether the object doing it is large or
   * small.
   */
  const textArea = Math.max(
    1,
    textRects.reduce((sum, r) => sum + r.width * r.height, 0),
  )
  const diagonal = Math.hypot(viewport.width, viewport.height)

  const search = (yMin: number, yMax: number) => {
    let best = { x: clampedPreferred.x, y: Math.min(yMax, Math.max(yMin, clampedPreferred.y)) }
    let bestScore = Infinity
    let bestOverlap = 1

    for (let ix = 0; ix < GRID_X; ix++) {
      const cx =
        GRID_X === 1 ? xLimit.min : xLimit.min + ((xLimit.max - xLimit.min) * ix) / (GRID_X - 1)

      for (let iy = 0; iy < GRID_Y; iy++) {
        const cy = GRID_Y === 1 ? yMin : yMin + ((yMax - yMin) * iy) / (GRID_Y - 1)

        /*
         * The Core's bounding square, not a circle. A square over-estimates the
         * overlap at the corners, which biases the search away from text by a
         * little — the safe direction to be wrong in, and much cheaper than
         * integrating a disc against a rectangle 221 times.
         */
        const box: ScreenRect = {
          x: cx - radiusPx,
          y: cy - radiusPx,
          width: radiusPx * 2,
          height: radiusPx * 2,
        }

        let covered = 0
        for (const rect of textRects) covered += overlapArea(box, rect)

        const overlap = Math.min(1, covered / textArea)
        const distance = Math.hypot(cx - clampedPreferred.x, cy - clampedPreferred.y) / diagonal
        const score = overlap * OVERLAP_WEIGHT + distance * DISTANCE_WEIGHT

        if (score < bestScore) {
          bestScore = score
          bestOverlap = overlap
          best = { x: cx, y: cy }
        }
      }
    }

    return { ...best, overlap: bestOverlap }
  }

  // Pass 1 — fully contained, which is what every chapter gets by default.
  const contained = search(yLimit.min, yLimit.max)

  /*
   * Pass 2 — only if containment and legibility cannot both be had.
   *
   * Chapter 03 is the case this exists for. It inherits chapter 02's Z 2.2
   * closest approach, and its section heading is already on screen at the
   * chapter's first frame, so the Core's silhouette is wider than the gap
   * between that heading and the cards below it. No contained position clears
   * the description; the measured result was 1.98:1 against 4.5:1.
   *
   * Letting the Core run out of the bottom of frame is the one remaining move
   * that does not dim it, shrink it, or disturb chapter 02.
   */
  const CLEAR_ENOUGH = 0.005
  if (bottomBleed === 'never' || contained.overlap <= CLEAR_ENOUGH) {
    return { x: contained.x / viewport.width, y: contained.y / viewport.height }
  }

  const bled = search(yLimit.min, viewport.height * MIN_CENTRE_ON_SCREEN)

  // Only take the bleeding answer if it is genuinely clearer. A crop that buys
  // nothing is just a crop.
  const chosen = bled.overlap < contained.overlap - CLEAR_ENOUGH ? bled : contained
  return { x: chosen.x / viewport.width, y: chosen.y / viewport.height }
}
