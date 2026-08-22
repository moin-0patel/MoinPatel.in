import { useEffect, useState } from 'react'

import type { ScreenRect } from '@/lib/coreFraming'

/**
 * Where the page's words are, in document coordinates.
 *
 * MEASURED ON REFLOW, NEVER PER FRAME.
 *
 * The scene needs to know what it must avoid on every frame, but reading layout
 * on every frame is how a scroll handler becomes the bottleneck. So the DOM is
 * read only when the page actually changes shape, and the render loop does
 * nothing but subtract `scrollY` — arithmetic, no layout.
 *
 * RANGE RECTS, NOT BOUNDING BOXES.
 *
 * An element's border box includes padding, borders and whatever the layout put
 * beside the text; a Range over its contents gives the rectangles the glyphs
 * actually occupy. The contrast guard arrived at the same technique after three
 * wrong answers, and using it here is deliberate: the scene should avoid
 * precisely the rectangles the guard measures, or the two disagree about what
 * "behind the text" means.
 */
/**
 * Is this text already sitting on something opaque?
 *
 * Text inside a card, chip or panel is shielded: whatever the scene does behind
 * the page, that text composites against its own surface and its contrast never
 * changes. Treating it as must-avoid was actively harmful — the capability grid
 * alone contributed four opaque cards' worth of rects, which filled the search
 * space and pushed the Core up into the section heading, the one piece of text
 * in that viewport that WAS vulnerable. The constraint was protecting the safe
 * text by sacrificing the exposed text.
 *
 * So only text whose backdrop is the page itself counts. That is also exactly
 * what the contrast guard measures, which keeps the two in agreement.
 */
/**
 * The alpha of a computed background-color, whatever syntax it arrived in.
 *
 * This existed as `startsWith('rgba') ? split(',')[3] : 1` and that was wrong in
 * a way worth spelling out. Tailwind v4 emits modern colour spaces, so a
 * translucent surface computes to `oklab(0.226 0.004 -0.017 / 0.3)` — no
 * "rgba" prefix, so the old code called it alpha 1. The Skills section is
 * exactly that: a 30% background that the Core shows straight through. The
 * shield filter marked every heading inside it as protected, the framing search
 * dutifully ignored them, and "Business Tools" measured 3.78:1 while the search
 * believed there was no exposed text in the viewport at all.
 *
 * Both spellings are handled: the modern `/ <alpha>` slash form used by
 * oklab/oklch/color/rgb, and the legacy comma form.
 */
function backgroundAlpha(background: string): number {
  if (background === 'transparent' || background === 'none') return 0

  const slash = /\/\s*([\d.]+)(%?)\s*\)/.exec(background)
  if (slash) {
    const value = parseFloat(slash[1] ?? '1')
    return slash[2] === '%' ? value / 100 : value
  }

  if (background.startsWith('rgba')) return parseFloat(background.split(',')[3] ?? '1')
  return 1
}

function isShielded(el: HTMLElement): boolean {
  let node: HTMLElement | null = el
  while (node && node !== document.body) {
    // 0.9 rather than 1: a background at 95% still lets a trace of the scene
    // through, but not enough to move a contrast ratio.
    if (backgroundAlpha(getComputedStyle(node).backgroundColor) > 0.9) return true
    node = node.parentElement
  }
  return false
}

export function useTextGeometry(): ScreenRect[] {
  const [rects, setRects] = useState<ScreenRect[]>([])

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const found: ScreenRect[] = []
      const scrollY = window.scrollY

      for (const el of document.querySelectorAll<HTMLElement>(
        'main h1, main h2, main h3, main h4, main p, main li, main a, main span, footer p, footer a, footer h2',
      )) {
        // Only elements holding their OWN text; otherwise every wrapper
        // contributes a duplicate rect covering all of its children.
        let hasOwnText = false
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            hasOwnText = true
            break
          }
        }
        if (!hasOwnText) continue

        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        // Mid-reveal text still becomes readable a moment later, so it counts.
        // Fully transparent decoration does not.
        if (parseFloat(style.opacity) < 0.05) continue
        if (isShielded(el)) continue

        const range = document.createRange()
        range.selectNodeContents(el)
        for (const rect of range.getClientRects()) {
          if (rect.width < 8 || rect.height < 6) continue
          found.push({
            x: rect.x,
            y: rect.y + scrollY,
            width: rect.width,
            height: rect.height,
          })
        }
      }

      setRects((previous) => {
        // Layout thrash produces a stream of identical measurements; comparing
        // before setting keeps them from re-rendering the scene for nothing.
        if (
          previous.length === found.length &&
          previous.every(
            (r, i) =>
              Math.abs(r.x - found[i]!.x) < 1 &&
              Math.abs(r.y - found[i]!.y) < 1 &&
              Math.abs(r.width - found[i]!.width) < 1 &&
              Math.abs(r.height - found[i]!.height) < 1,
          )
        ) {
          return previous
        }
        return found
      })
    }

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure)
    }

    measure()

    /*
     * The same trigger set as useChapterTimeline, and for the same reasons:
     * sections fetch their own data and grow, web fonts change line counts, and
     * the 1024px transition reflows the whole page. A stale measurement here
     * means the Core confidently avoiding where the text used to be.
     */
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    window.addEventListener('resize', schedule)
    window.addEventListener('load', schedule)
    document.fonts?.ready.then(schedule).catch(() => {})

    // Text reveals change opacity, which changes what counts as text.
    const interval = window.setInterval(schedule, 1000)

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      observer.disconnect()
      window.clearInterval(interval)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('load', schedule)
    }
  }, [])

  return rects
}
