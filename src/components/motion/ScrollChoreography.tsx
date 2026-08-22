import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect } from 'react'

import { CHAPTERS, type ChapterId } from '@/lib/chapters'
import { buildChapterBands, type SectionMeasurement } from '@/lib/chapterTimeline'

/**
 * Phase 4 — the DOM half of the choreography, motion spec section 3.1.
 *
 * The scene's timeline lives in the render loop (see ScrollDirector); this is
 * everything made of text. They are separate on purpose: three.js objects want
 * to be written inside a frame, and DOM elements want a library that already
 * knows about trigger positions, resize refreshes and transform batching.
 *
 * WHY GSAP EARNS ITS PLACE HERE AND NOT IN THE SCENE
 *
 * ScrollTrigger solves the parts that are tedious and easy to get subtly wrong:
 * per-element start positions, recalculating them when the layout reflows or an
 * async section finishes loading, and batching writes so thirty reveals do not
 * each force their own layout. Reimplementing that against the existing scroll
 * hook would be a worse ScrollTrigger. Inside the canvas it would be the
 * opposite trade — GSAP's ticker runs between frames, so it would write to
 * three.js objects the renderer had already read.
 *
 * NOT MOUNTED UNDER REDUCED MOTION
 *
 * A11Y-10 and spec section 7. The guard is at the call site rather than an
 * early return here, so under `prefers-reduced-motion` this module's inline
 * styles are never applied at all — the page renders at its natural final
 * state. An early return would still leave whatever GSAP had already set.
 *
 * THE NON-NEGOTIABLE — spec section 11.2
 *
 * "Nothing is revealed only by scrolling. Scroll changes emphasis, never
 * availability." Reveals fire at `top 85%`, so an element begins animating
 * before it is fully on screen and is finished by the time it can be read.
 * Content is in the HTML from first paint either way; if this module fails to
 * load, nothing is ever set to `opacity: 0` and the page reads normally.
 */

gsap.registerPlugin(ScrollTrigger)

/** Section 3.1 — one set of values, used by every text element on the page. */
const REVEAL_FROM = { opacity: 0, y: 40, filter: 'blur(8px)' }
const REVEAL_TO = { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power2.out', duration: 0.7 }

/** Section 3.1 — stagger between siblings, as a fraction of the parent's range. */
const STAGGER = 0.08

export function ScrollChoreography() {
  useEffect(() => {
    let context: gsap.Context | null = null
    let cancelled = false

    /*
     * Build the timeline only once the page has stopped growing.
     *
     * Sections fetch their own data, and Featured Projects in particular
     * renders a skeleton first. Setting up against that shorter page meant its
     * cards did not exist yet, so no tween was ever created for them and
     * chapter 04's text simply never animated — measured at opacity 1.00 while
     * every other chapter started at 0.00. Refreshing ScrollTrigger does not
     * help: refresh recalculates positions for tweens that exist, it does not
     * discover new elements.
     *
     * `aria-busy` is already the app's own signal for "this region is still
     * loading" — the same one verify:ui waits on — so this reuses it rather
     * than inventing a second convention.
     */
    const build = () => {
      if (cancelled) return
      context = gsap.context(() => {
        /*
         * The same section geometry the scene uses — see chapterTimeline.ts.
         *
         * Chapter 02's line sequence has to run on the same clock as the
         * camera's closest approach, and that clock is now "where the
         * introduction section actually is", not a share of document height.
         * Measured inside the getter so ScrollTrigger's refresh picks up a
         * reflow rather than caching a boundary computed at first paint.
         */
        const measuredBand = (chapter: ChapterId) => {
          const sections: SectionMeasurement[] = []
          for (const id of CHAPTERS) {
            const el = document.querySelector<HTMLElement>(`[data-chapter="${id}"]`)
            if (!el) continue
            const rect = el.getBoundingClientRect()
            sections.push({ chapter: id, top: rect.top + window.scrollY, height: rect.height })
          }
          const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
          const bands = buildChapterBands(sections, window.innerHeight, maxScroll)
          return bands.find((b) => b.chapter === chapter) ?? { enter: 0, exit: maxScroll }
        }

        /*
         * Chapter 02 — the four statement lines, scrubbed.
         *
         * The one place text replaces itself, and the spec is emphatic about why:
         * "four statements stacked on screen at once is a paragraph, and a
         * paragraph is not a statement." Sub-beat table, section 4, chapter 02:
         * each line owns a quarter, lines 1-3 leave, line 4 stays and carries
         * into chapter 03.
         */
        const lines = gsap.utils.toArray<HTMLElement>('[data-line]')
        if (lines.length > 0) {
          /*
           * Bound to the CHAPTER RANGE, not to the section's own geometry.
           *
           * The first version triggered on the section box — start "top top",
           * end "bottom bottom" — and the introduction is short, so the whole
           * four-line sequence finished within a couple of hundred pixels and
           * was already over by the time the document reached 20% progress. The
           * scene, which reads CHAPTER_RANGES directly, was still early in
           * chapter 02. Text and camera were choreographing different moments.
           *
           * Section 1 allocates chapter 02 to 12-28% of document progress, so
           * that is what this scrubs against: the same clock the Core runs on,
           * which is the whole point of the statement landing while the camera
           * makes its closest approach.
           */
          const band = () => measuredBand('introduction')

          /*
           * ONE timeline for all four lines, not one each.
           *
           * Four separate timelines were four separate clocks: ScrollTrigger
           * normalises each timeline's own total duration across the same
           * scroll range, so line 1's timeline (0.25s long) and line 4's
           * (0.98s) mapped the identical scroll span onto completely different
           * schedules. Line 1's exit, specified at 25% of the chapter, actually
           * played at 88% of it — the lines overlapped instead of replacing one
           * another, which is precisely the "paragraph, not a statement"
           * failure the spec calls out.
           *
           * Sharing one timeline makes the positions below mean what the
           * sub-beat table says they mean.
           */
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: document.documentElement,
              start: () => band().enter,
              end: () => band().exit,
              scrub: 0.6, // section 3.4 — the same smoothing lag as the scene
              // The page's height changes as sections load and as the viewport
              // resizes; without this the pixel positions are computed once and
              // then quietly wrong.
              invalidateOnRefresh: true,
            },
          })

          lines.forEach((line, index) => {
            const share = 1 / lines.length
            const at = index * share
            const isLast = index === lines.length - 1

            // Section 4, chapter 02 sub-beats. At four lines these evaluate to
            // the table's own numbers: in over 0.00-0.08, out over 0.22-0.25,
            // and the same shape a quarter later for each subsequent line.
            timeline.fromTo(line, REVEAL_FROM, { ...REVEAL_TO, duration: share * 0.32 }, at)

            if (!isLast) {
              // Lines 1-3 recede so the next one lands alone. Section 3.1
              // reversed: out is opacity 1 -> 0.
              timeline.to(
                line,
                { opacity: 0, y: -20, filter: 'blur(6px)', duration: share * 0.12 },
                at + share * 0.88,
              )
            }
          })

          // Pin the timeline's end to 1 so the positions above are fractions of
          // the chapter, not of whatever the last tween happened to finish at.
          timeline.set({}, {}, 1)
        }

        /*
         * Chapter 03 — the four capability cards, revealed one at a time.
         *
         * `data-capability` carries the index, so the stagger follows the source
         * order rather than whatever order the grid happens to lay them out in at
         * this breakpoint. Divided by the number of cards, not by four: section 9
         * forbids hard-coding the count, and capabilities.ts is free to grow.
         */
        const capabilities = gsap.utils.toArray<HTMLElement>('[data-capability]')
        if (capabilities.length > 0) {
          gsap.fromTo(capabilities, REVEAL_FROM, {
            ...REVEAL_TO,
            stagger: STAGGER * 2,
            scrollTrigger: { trigger: capabilities[0], start: 'top 85%', once: true },
          })
        }

        /*
         * Every other chapter — headings and copy, staggered on entry.
         *
         * Scoped to `[data-chapter]`, which excludes the hero: FR-HOME-02 owns
         * the hero's own reveal (<=700ms, 70ms intervals) and the owner's ruling
         * kept that clause with the PRD rather than handing it to this timeline.
         * The hero is also the one composition already approved and verified;
         * animating it here would put it back in play.
         */
        for (const chapter of CHAPTERS) {
          if (chapter === 'hero' || chapter === 'introduction') continue
          const section = document.querySelector<HTMLElement>(`[data-chapter="${chapter}"]`)
          if (!section) continue

          const targets = gsap.utils
            .toArray<HTMLElement>(section.querySelectorAll('h2, h3, p, li, a'))
            // Capability cards have their own beat above; animating them twice
            // would leave whichever tween finished last holding the opacity.
            .filter((el) => !el.closest('[data-capability]'))

          if (targets.length === 0) continue

          gsap.fromTo(targets, REVEAL_FROM, {
            ...REVEAL_TO,
            stagger: STAGGER,
            scrollTrigger: { trigger: section, start: 'top 85%', once: true },
          })
        }
      })
    }

    // Poll rather than observe: the condition is "nothing is loading", which is
    // the absence of an element, and MutationObserver is awkward at spotting
    // absences. Capped so a stuck query cannot mean no choreography at all.
    const started = Date.now()
    const waitForContent = window.setInterval(() => {
      const busy = document.querySelectorAll('[aria-busy="true"]').length > 0
      if (busy && Date.now() - started < 4000) return
      window.clearInterval(waitForContent)
      build()
      // Positions are computed during build; one refresh after layout settles
      // catches any late reflow (web fonts, images) without re-creating tweens.
      window.setTimeout(() => ScrollTrigger.refresh(), 600)
    }, 120)

    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)

    return () => {
      cancelled = true
      window.clearInterval(waitForContent)
      window.removeEventListener('load', refresh)
      // revert() also restores every inline style GSAP set, so leaving the
      // homepage cannot strand an element at opacity 0.
      context?.revert()
    }
  }, [])

  return null
}

export default ScrollChoreography
