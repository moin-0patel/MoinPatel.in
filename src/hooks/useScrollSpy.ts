import { useEffect, useState } from 'react'

/**
 * Scroll spy — PRD FR-CASE-06 (case-study section nav) and 9.3 (home
 * section-scroll spy).
 *
 * Returns the id of the section currently considered "active".
 *
 * IntersectionObserver rather than a scroll listener: a scroll handler fires
 * dozens of times a second and would need throttling, and every frame of it
 * competes with the render work INP is measured against (PERF-04).
 *
 * The rootMargin is the interesting part. `-20% 0px -70% 0px` shrinks the
 * viewport to a band roughly a fifth from the top, so a heading becomes active
 * as it reaches reading position rather than the instant it appears at the
 * bottom of the screen. Without it, the last item highlights early and the nav
 * runs ahead of the reader.
 */
export function useScrollSpy(ids: string[], enabled = true): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)

  // Serialised so the effect re-runs when the SET of ids changes, not on every
  // render that happens to build a new array literal with the same contents.
  const key = ids.join('|')

  useEffect(() => {
    if (!enabled || ids.length === 0) {
      setActiveId(null)
      return
    }

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    // Seed the initial value so the first item is highlighted before any
    // scrolling happens, rather than the nav starting with nothing active.
    setActiveId((current) => current ?? elements[0]?.id ?? null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        // Only update when something is in the band. Clearing on the way out
        // would make the nav flicker to nothing between sections.
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )

    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
    // `key` stands in for `ids` deliberately — see the note above.
  }, [key, ids, enabled])

  return activeId
}
