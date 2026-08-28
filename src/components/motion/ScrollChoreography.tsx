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

/**
 * THE REVEAL, RE-MEASURED OFF THE LIVE REFERENCE.
 *
 * Every value here replaced a guess, and the guess it replaced was wrong in a
 * specific and instructive way. Phase 0 scanned computed styles for transition
 * declarations, found `transform, opacity` at `0.4s / 0.2s` on
 * `cubic-bezier(0.25, 0.46, 0.45, 0.94)`, and recorded it as the reference's
 * reveal. Re-measured: that spec is carried by seven elements and the
 * representative one is `DIV.popup-card-wrap`. It is the POPUP transition. The
 * reference's scroll reveals are GSAP-driven and never touch a CSS transition,
 * so a scan of computed styles could not see them by construction.
 *
 * These numbers come from sampling the animated properties frame by frame,
 * driven with real wheel events, on a text line travelling one line-height:
 *
 *   DURATION 0.6s. Solving five independent sample points for duration under a
 *   cubic ease-out gives 582, 595, 600, 601 and 603ms. Under a quadratic ease
 *   the same points give 406, 432, 461 and 500ms — drifting upward, because
 *   power2 cannot produce the tail the reference actually has. The old value
 *   was 0.7s.
 *
 *   EASE power3.out, which is that cubic ease-out. Was power2.out.
 *
 *   NO BLUR. `filter` reads `none` on every reference element, before and
 *   during its reveal. The old `blur(8px)` was invented here, and it is also
 *   the most expensive part of the tween — it forces a filter pass per frame
 *   on text.
 *
 *   STAGGER 0.105s, measured at 102, 102 and 112ms between consecutive
 *   siblings across two parallel groups. Was 0.08.
 *
 * WHAT IS NOT COPIED, AND WHY
 *
 * The reference's text reveal is a MASKED slide: the line sits at
 * translateY(1 line-height) inside an `overflow: hidden` parent and rides up
 * with opacity pinned at 1 — it is never faded. Reproducing that means wrapping
 * every revealing line in a clipping element, which changes the DOM of every
 * text block on the page and risks clipping descenders and focus rings. That is
 * a layout change, not a motion one, so this keeps a fade-and-rise and takes
 * the reference's timing, easing and stagger. The distance stays 40px: the
 * reference travels one line-height, which is 27-66px depending on the element.
 */
const REVEAL_FROM = { opacity: 0, y: 40 }
const REVEAL_TO = { opacity: 1, y: 0, ease: 'power3.out', duration: 0.6 }

/** Seconds between revealing siblings — see above. */
const STAGGER = 0.105

/**
 * The most a group's stagger may spread, in seconds — and the reason it exists
 * is that the measured 105ms was measured between FIVE siblings.
 *
 * Applied naively to the Process chapter's 27 targets, 105ms each is a 2.8s
 * queue before the last element even starts, and this module's own
 * non-negotiable is that a reveal is finished by the time the content can be
 * read. Verified live: after a full settle, Process still had paragraphs at
 * opacity 0.0-0.9 sitting in the middle of the viewport.
 *
 * The reference never staggers a group that large — its biggest measured group
 * is five lines, a 420ms spread. So the per-sibling gap holds at 105ms for
 * groups up to ~7 and compresses beyond that, keeping the total spread at what
 * the reference's own largest group actually spends.
 */
const STAGGER_MAX_SPREAD = 0.63

/** 105ms between siblings, until the group is large enough to cap. */
const staggerFor = (count: number) =>
  count > 1 ? Math.min(STAGGER, STAGGER_MAX_SPREAD / (count - 1)) : 0

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
              //
              // `blur(6px)` removed here for the same reason it was removed
              // from REVEAL_TO: the reference carries `filter: none` on every
              // element through every reveal, so the blur was ours rather than
              // its. It is also the one property in this tween that forces a
              // per-frame filter pass, and this tween is SCRUBBED — it runs on
              // every scroll event rather than once.
              timeline.to(
                line,
                { opacity: 0, y: -20, ease: 'power3.out', duration: share * 0.12 },
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
            // The card grid beats at double the text stagger, as before, but
            // through the same cap so a future fifth card cannot stretch it.
            stagger: Math.min(STAGGER * 2, staggerFor(capabilities.length) * 2),
            scrollTrigger: { trigger: capabilities[0], start: 'top 85%', once: true },
          })
        }

        /*
         * The journey cards — the reference's `.about-card` reveal.
         *
         * Measured on the live site: each card enters at opacity 0,
         * scale(0.6), translated down ~34px, and settles over roughly 1.2s of
         * damped, scroll-coupled motion. That mechanism (a scrubbed spring) is
         * not this module's grammar, so the card takes the shared entrance
         * tween instead — same values as everything else — plus the scale the
         * reference demonstrably has. 0.94 rather than 0.6: the reference
         * spreads its growth over a damped 1.2s, and 0.6 compressed into a
         * 600ms entrance reads as a pop it does not have.
         *
         * Experience is not a chapter (the chapter list drives the 3D scene's
         * camera bands and is not to be re-cut for a reveal), so this is the
         * same explicit opt-in `data-capability` uses. This is also the
         * extension point the chapter-loop comment promised Journey.
         */
        const journeyCards = gsap.utils.toArray<HTMLElement>('[data-journey-card]')
        if (journeyCards.length > 0) {
          gsap.fromTo(
            journeyCards,
            { ...REVEAL_FROM, scale: 0.94 },
            {
              ...REVEAL_TO,
              scale: 1,
              stagger: staggerFor(journeyCards.length),
              scrollTrigger: { trigger: journeyCards[0], start: 'top 85%', once: true },
            },
          )
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
        const reveal = (section: HTMLElement) => {
          const targets = gsap.utils
            .toArray<HTMLElement>(section.querySelectorAll('h2, h3, p, li, a'))
            // Capability and journey cards have their own beats above;
            // animating their contents twice would leave whichever tween
            // finished last holding the opacity.
            .filter((el) => !el.closest('[data-capability]') && !el.closest('[data-journey-card]'))

          if (targets.length === 0) return

          gsap.fromTo(targets, REVEAL_FROM, {
            ...REVEAL_TO,
            stagger: staggerFor(targets.length),
            scrollTrigger: { trigger: section, start: 'top 85%', once: true },
          })
        }

        for (const chapter of CHAPTERS) {
          if (chapter === 'hero' || chapter === 'introduction') continue
          const section = document.querySelector<HTMLElement>(`[data-chapter="${chapter}"]`)
          if (section) reveal(section)
        }

        /*
         * The remaining sections — Impact, Experience, Skills, Education, FAQ.
         *
         * An earlier ruling left these still, on a measurement showing the
         * reference's own later sections carry no pending reveals. The owner
         * overruled it (2026-08-27): every section takes the entrance grammar,
         * so the page reads as one continuous choreography rather than motion
         * that runs out two-thirds of the way down. The values stay the
         * measured reference values — this extends coverage, not vocabulary.
         */
        for (const section of gsap.utils.toArray<HTMLElement>('main section:not([data-chapter])')) {
          reveal(section)
        }
      })
    }

    // Poll rather than observe: the condition is "nothing is loading", which is
    // the absence of an element, and MutationObserver is awkward at spotting
    // absences. Capped so a stuck query cannot mean no choreography at all —
    // but generously: a cold Supabase round-trip has been measured at ~3.3s,
    // and a build that fires mid-load arms elements React is about to replace
    // (see the variant-shape note in ExperienceSection).
    const started = Date.now()
    const waitForContent = window.setInterval(() => {
      const busy = document.querySelectorAll('[aria-busy="true"]').length > 0
      if (busy && Date.now() - started < 8000) return
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
