import { useEffect, useState } from 'react'

import type { ChapterId } from '@/lib/chapters'
import {
  buildChapterBands,
  type ChapterBand,
  type SectionMeasurement,
} from '@/lib/chapterTimeline'

/**
 * Measures where the seven narrative sections actually are, and keeps measuring.
 *
 * The arithmetic lives in chapterTimeline.ts, which is pure and tested. This is
 * the part that has to touch the DOM: finding the sections, reading their
 * geometry, and noticing when any of it changes.
 *
 * WHAT MAKES IT CHANGE
 *
 * More than it first appears, which is why the observers are worth the code:
 *
 *   - viewport resize, which moves every band because the enter/exit points are
 *     fractions of viewport height
 *   - the 1024px transition, where the hero goes from stacked to two-column and
 *     every section below it shifts
 *   - sections that fetch their own data and grow when it arrives
 *   - fonts loading, images decoding, a case-study card wrapping to a new line
 *
 * A stale measurement is not a crash; it is worse. The timeline keeps running
 * against boundaries that no longer match anything on screen, which is exactly
 * the class of bug this whole module replaced.
 */
export function useChapterTimeline(chapters: readonly ChapterId[]): ChapterBand[] {
  const [bands, setBands] = useState<ChapterBand[]>([])

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0

      const sections: SectionMeasurement[] = []
      for (const chapter of chapters) {
        const el = document.querySelector<HTMLElement>(`[data-chapter="${chapter}"]`)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        sections.push({
          chapter,
          // Document-relative, not viewport-relative: bands are scroll
          // positions, and a viewport-relative top would be a different number
          // every frame.
          top: rect.top + window.scrollY,
          height: rect.height,
        })
      }

      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      )

      setBands((previous) => {
        const next = buildChapterBands(sections, window.innerHeight, maxScroll)
        // Bail out when nothing moved. Without this, a ResizeObserver that
        // fires on every layout would set state with a fresh array each time
        // and re-render the scene for no reason.
        if (
          previous.length === next.length &&
          previous.every(
            (band, i) =>
              band.chapter === next[i]!.chapter &&
              Math.abs(band.enter - next[i]!.enter) < 1 &&
              Math.abs(band.exit - next[i]!.exit) < 1,
          )
        ) {
          return previous
        }
        return next
      })
    }

    // Coalesced to one measurement per frame. Layout reads are the expensive
    // half of this, and a burst of observer callbacks would otherwise force one
    // reflow each.
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure)
    }

    measure()

    const observer = new ResizeObserver(schedule)
    // Watching the body catches the page growing; watching each section catches
    // one of them growing without changing the total, which happens when two
    // sections reflow in opposite directions.
    observer.observe(document.body)
    for (const chapter of chapters) {
      const el = document.querySelector<HTMLElement>(`[data-chapter="${chapter}"]`)
      if (el) observer.observe(el)
    }

    window.addEventListener('resize', schedule)
    window.addEventListener('load', schedule)
    // Web fonts change line counts, which changes section heights. Guarded
    // because `document.fonts` is absent in some environments.
    document.fonts?.ready.then(schedule).catch(() => {})

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('load', schedule)
    }
  }, [chapters])

  return bands
}
