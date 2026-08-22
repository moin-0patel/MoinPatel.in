import { useEffect, useState } from 'react'

import { CHAPTERS, type ChapterId } from '@/lib/chapters'

/**
 * Normalized scroll state — spec §18.
 *
 * "Do not create dozens of unrelated scroll listeners. Prefer one coordinated
 * scroll state." So this is the single source: one listener, one
 * IntersectionObserver, shared by every consumer.
 *
 * `useScrollSpy` already exists and drives the nav's active link. It is left
 * alone rather than folded in here: it answers a different question (which
 * anchor is nearest the top) for a different consumer, and merging them would
 * couple the navigation to the animation timeline for no gain. If Phase 4 finds
 * they genuinely want the same answer, that is the moment to unify them — with
 * the animation requirements known, rather than guessed at now.
 *
 * PHASE 1 SCOPE: this reports state and nothing more. No GSAP, no animation, no
 * 3D. Phase 4 consumes `progress` to drive the ScrollTrigger timeline and
 * `activeChapter` to drive camera states.
 *
 * A11Y-10 / spec §22: reduced motion does not disable this. Progress is
 * information, not movement — the navigation still needs to know where the
 * reader is. What Phase 4 does with it is where the motion guard belongs.
 */

export type ScrollProgress = {
  /** 0 at the top of the document, 1 at the bottom. */
  progress: number
  /** The chapter currently occupying most of the viewport, or null. */
  activeChapter: ChapterId | null
}

export function useScrollProgress(): ScrollProgress {
  const [progress, setProgress] = useState(0)
  const [activeChapter, setActiveChapter] = useState<ChapterId | null>(null)

  useEffect(() => {
    let frame = 0

    const read = () => {
      frame = 0
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      // A page shorter than the viewport is fully "read"; dividing by zero here
      // would otherwise produce NaN and poison every consumer downstream.
      setProgress(scrollable <= 0 ? 1 : Math.min(1, Math.max(0, window.scrollY / scrollable)))
    }

    // rAF-coalesced: scroll fires far more often than a frame can paint, and
    // setting state per event is how a scroll handler becomes the bottleneck.
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  useEffect(() => {
    const elements = CHAPTERS.map((id) =>
      document.querySelector<HTMLElement>(`[data-chapter="${id}"]`),
    ).filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    /*
     * IntersectionObserver rather than measuring every chapter on each scroll
     * frame: the browser does the geometry off the main thread, and the
     * threshold list gives enough resolution to pick a winner without
     * per-frame layout reads.
     */
    const ratios = new Map<ChapterId, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-chapter') as ChapterId | null
          if (id) ratios.set(id, entry.intersectionRatio)
        }
        let best: ChapterId | null = null
        let bestRatio = 0
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            best = id
          }
        }
        setActiveChapter(best)
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { progress, activeChapter }
}
