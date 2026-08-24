/**
 * Browser verification — `npm run verify:ui`
 *
 * Closes PRD Phase 8 against its own exit criteria (43.3, line 1976):
 *
 *   "Home passes responsive + axe checks and renders correctly with an
 *    empty database"
 *
 * and moves FR-NAV-02 from *implemented* to *browser verified*.
 *
 * WHY THIS EXISTS
 *
 * Until this script, no browser had ever rendered this application. Every UI
 * claim rested on tsc, ESLint and library documentation — none of which can see
 * a runtime invariant. The first run found the homepage rendering as a
 * completely blank page: `<Button asChild>` passed Radix Slot two children and
 * Slot threw on mount, blanking `/`, `/404`, `/500` and the case study. That
 * bug had been latent since Phase 7 and passed every existing gate.
 *
 * Serves the PRODUCTION build through Vite's programmatic preview, so what is
 * tested is the prerendered HTML plus hydration — what a visitor receives.
 *
 * Read-only with respect to the database: it loads public pages as an
 * anonymous visitor and writes nothing.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

import { AxeBuilder } from '@axe-core/playwright'
import { chromium } from 'playwright'
import { preview } from 'vite'

const PORT = 4180
const BASE = `http://localhost:${PORT}`

/**
 * PERF-05 — JavaScript budgets, in KB gzipped.
 *
 * Added BEFORE any 3D dependency is installed, on purpose. A budget agreed in
 * conversation and never measured is not a budget; the first `npm install three`
 * has to either fit or fail loudly, and it can only do that if the number is
 * already asserted.
 *
 * TWO INDEPENDENT MEASUREMENTS, and the distinction is the whole point.
 *
 * The SHARED SHELL is the set of chunks common to EVERY route — what a visitor
 * downloads no matter where they land. It is measured by intersecting the chunk
 * sets rather than by naming an entry chunk, because the hashed filenames change
 * every build and a hard-coded name would silently stop matching. This is the
 * assertion that catches a deferred dependency being hoisted into the shared
 * graph: lazy-loading is only a real win if the deferred thing stays out of here.
 *
 * ROUTE-SPECIFIC WEIGHT is a route's total MINUS the shared shell — the cost of
 * choosing that page over any other.
 *
 * The first version of this guard budgeted route TOTALS at 180 KB while allowing
 * the shell 190, which is arithmetically unsatisfiable: every route contains the
 * shell, so the ceiling sat below the floor. It failed all five non-Home routes
 * on its first run and the numbers were re-decided rather than the measurement
 * weakened. Subtracting the shell is what makes 180 a number a route can act on:
 * it measures what that page is responsible for.
 *
 * HOME is the deliberate exception, governed by a TOTAL rather than a
 * route-specific figure. The 3D scene is lazy — paid for after the shell has
 * painted, by someone who is already reading — so its weight is real but not
 * blocking, and 180 KB of route-specific weight would be a budget the scene
 * could never fit. Home's route-specific weight is still measured and printed
 * every run so the exemption stays visible instead of becoming a blind spot.
 */
const SHARED_SHELL_GZIP_BUDGET_KB = 190
const ROUTE_SPECIFIC_GZIP_BUDGET_KB = 180
const HOME_TOTAL_GZIP_BUDGET_KB = 650

/** RES-12 / 41.6 — the eight widths the PRD names. */
const WIDTHS = [1920, 1440, 1280, 1024, 768, 430, 390, 375]
const MOBILE_BREAKPOINT = 768

const TRIGGER = 'button[aria-label="Open navigation menu"]'
const PANEL_ID = 'mobile-nav-panel'
const DIALOG = `#${PANEL_ID}`
const OVERLAY = 'div[class*="backdrop-blur"]'
// Follows the navigation's new split structure. Labels changed with the
// reference replication (Projects -> Work, Skills -> Capabilities, Home added);
// the assertion itself is unchanged — every nav link must appear in the sheet.
const NAV_LABELS = ['Home', 'About', 'Work', 'Capabilities', 'Experience', 'Contact']

/* --- harness --------------------------------------------------------------- */

let passed = 0
const failures = []
const notes = []
const deviations = []

const check = (name, ok, detail = '') => {
  if (ok) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * A requirement the product owner has ruled cannot be met as written, together
 * with the measured reason and what covers it instead.
 *
 * Deliberately its own category. It is NOT counted as a pass — an owner's
 * decision does not make an unmet requirement met, and quietly folding these
 * into the pass count is how a suite starts lying. It does not fail the run
 * either, because a known accepted trade-off should not mask a new regression.
 * It prints on every run so it stays visible and can be revisited.
 */
const deviation = (name, measured, ruling) => {
  deviations.push({ name, measured, ruling })
  console.log(`  ⊘ ${name} — ACCEPTED DEVIATION`)
  console.log(`      measured: ${measured}`)
  console.log(`      ruling:   ${ruling}`)
}

const section = (t) => console.log(`\n${t}`)

/** Collects page errors so a silent runtime crash cannot pass as a render. */
function watch(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message).split('\n')[0]))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`.slice(0, 160))
  })
  return errors
}

/**
 * Wait until no loading region is left on the page.
 *
 * Asserting "Featured Projects is absent" while its query is still pending
 * reads a skeleton as a product bug — the section renders during loading and
 * only returns null once the query resolves empty. First run did exactly that.
 */
async function waitForSettled(page) {
  await page.waitForFunction(() => document.querySelectorAll('[aria-busy="true"]').length === 0, {
    timeout: 15000,
  })
  await page.waitForTimeout(300)
}

const noHorizontalOverflow = (page, width) =>
  page.evaluate(
    (w) => document.documentElement.scrollWidth <= w + 1, // +1 absorbs sub-pixel rounding
    width,
  )

const DIST = path.resolve('dist')
const kb = (bytes) => Math.round((bytes / 1024) * 100) / 100

/**
 * Every JavaScript chunk a route actually pulls, measured gzipped.
 *
 * Recorded from the browser rather than by reading Rollup's output, because the
 * question is what a VISITOR downloads, and only the browser knows that. Static
 * analysis of the chunk graph would answer a related but different question and
 * would quietly miss anything fetched at runtime — which is precisely the shape
 * the 3D scene will take.
 *
 * A fresh context per route so nothing is served from a warm cache; a cached
 * chunk is still weight the first visitor paid for.
 *
 * The bytes come from the file on disk, not from the response: Vite's preview
 * server does not compress, so the wire size here would be the uncompressed one
 * and every budget would read ~3x its real cost. Gzipping the dist file gives a
 * stable, reproducible number that does not depend on the server's config.
 */
async function measureRoute(browser, routePath) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const chunks = new Set()

  page.on('response', (response) => {
    const { pathname } = new URL(response.url())
    if (pathname.endsWith('.js') && response.status() === 200) chunks.add(pathname)
  })

  try {
    await page.goto(`${BASE}${routePath}`, { waitUntil: 'load' })
    await waitForSettled(page)
    // Lazy chunks are requested after hydration settles; without this pause a
    // deferred bundle is invisible to the measurement and the budget passes for
    // the wrong reason.
    await page.waitForTimeout(1200)
  } finally {
    await context.close()
  }

  let bytes = 0
  const missing = []
  for (const pathname of chunks) {
    try {
      bytes += gzipSync(await readFile(path.join(DIST, pathname))).byteLength
    } catch {
      missing.push(pathname)
    }
  }

  return { bytes, chunks, missing }
}

/**
 * WCAG 1.4.3 for text sitting over the 3D scene, measured from composited
 * pixels at whatever viewport the page is currently set to.
 *
 * Runs at more than one width on purpose. The first version measured only
 * 1280x900 and passed the hero at 3.65:1 while the SAME hero was at 2.04:1 on
 * a phone — the Core is centred in the viewport, so at 390px it fills the
 * column and sits under every line instead of beside them. A desktop-only
 * contrast check on a viewport-centred object measures the easy case.
 */
async function measureOverlayContrast(page) {
  const viewport = page.viewportSize()
  const scrollY = await page.evaluate(() => window.scrollY)
  /*
   * ONE screenshot, taken with every candidate hidden at once.
   *
   * The first attempt screenshotted each element separately — hide, capture,
   * restore, twenty times. Two things were wrong with that. The scene rotates
   * at 2 degrees/second, so each capture sampled a different frame and the
   * same element measured differently run to run; and re-finding elements by
   * bounding box hid the wrong node, so still-visible glyphs were measured as
   * though they were the backdrop. Both produced confident numbers that did
   * not reproduce.
   *
   * Hiding everything and capturing once fixes both: every box is read from a
   * single frame, so the measurements are mutually consistent and stable
   * between runs, and element handles cannot drift onto the wrong node.
   */
  const handles = await page.$$('h1, h2, h3, p, a, span, li')
  const hasCanvas = await page.evaluate(
    () => !!document.querySelector('[data-scene-container] canvas'),
  )
  if (!hasCanvas) return { failures: [], worst: { ratio: Infinity, label: null }, examined: 0 }

  const targets = []
  for (const handle of handles) {
    const info = await handle.evaluate((el) => {
      const ownText = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join('')
      if (!ownText) return null

      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return null

      /*
       * Mid-reveal elements must be HIDDEN but not MEASURED.
       *
       * These were one condition, and collapsing them was a bug that produced
       * a very convincing false report: elements part-way through a GSAP fade
       * were filtered out of the target list so their ratios would not be taken
       * at an instant nobody sees — which also stopped them being hidden, so
       * they stayed on screen and became the backdrop for their neighbours.
       * The suite then reported failures against backdrops of #e4e1ee and
       * #c7c4d8 at 1.00:1. Those are the text colours: it was measuring text
       * against text and calling it a product defect.
       */
      const measurable = parseFloat(cs.opacity) >= 0.99

      /*
       * A gradient heading computes `color: rgba(0,0,0,0)` and carries its
       * real colours in backgroundImage. Reading only `color` there measures
       * a transparent pixel and reports a meaningless ratio. Both stops are
       * checked, because the pale end is the half that fails.
       */
      const alpha = cs.color.startsWith('rgba') ? parseFloat(cs.color.split(',')[3]) : 1
      const colours =
        alpha > 0.05
          ? [cs.color]
          : (cs.backgroundImage.match(/rgba?\([^)]+\)/g) ?? []).filter(
              (c) => !c.startsWith('rgba') || parseFloat(c.split(',')[3]) > 0.05,
            )
      if (colours.length === 0) return null

      const size = parseFloat(cs.fontSize)
      const weight = parseInt(cs.fontWeight, 10) || 400
      return {
        label: `<${el.tagName.toLowerCase()}> "${ownText.slice(0, 32)}"`,
        colours,
        measurable,
        // WCAG 1.4.3: 3:1 for large text (>=24px, or >=18.66px bold), else 4.5:1.
        required: size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5,
      }
    })
    if (!info) continue

    /*
     * The GLYPH LINE BOXES, not the element's border box.
     *
     * A border box includes padding, borders and any sibling chrome the layout
     * happens to put inside it, and the peak-luminance sample kept latching
     * onto exactly those: a 1px `--color-strong` button border reported as a
     * #918fa1 backdrop at 2.45:1 for text that sits on a dark fill and reads
     * perfectly. A Range over the element's own text yields the rectangles the
     * words actually occupy, which is the only region the question is about.
     */
    const rects = await handle.evaluate((el) => {
      const range = document.createRange()
      range.selectNodeContents(el)
      return [...range.getClientRects()]
        .filter((r) => r.width >= 4 && r.height >= 4)
        .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height }))
    })
    if (rects.length === 0) continue
    const raw = {
      x: Math.min(...rects.map((r) => r.x)),
      y: Math.min(...rects.map((r) => r.y)) + scrollY,
      width: Math.max(...rects.map((r) => r.x + r.width)) - Math.min(...rects.map((r) => r.x)),
      height: Math.max(...rects.map((r) => r.y + r.height)) - Math.min(...rects.map((r) => r.y)),
    }
    if (raw.width < 4 || raw.height < 4) continue
    // boundingBox is document-relative; the screenshot clip is viewport-relative.
    // Below the fold that difference is the entire scroll offset, so a check
    // that ignored it would sample a rectangle nowhere near the element.
    // Range rects are viewport-relative already; scrollY was added above only
    // so this line reads the same as it did for boundingBox.
    const box = { ...raw, y: raw.y - scrollY }

    /*
     * Two different questions, two different tests.
     *
     * HIDE anything that overlaps the viewport at all, including elements only
     * half on screen: the visible half is still real pixels that would be
     * mistaken for a backdrop.
     *
     * MEASURE only boxes wholly inside it — a partially captured box would
     * report contrast for pixels the reader never sees at this width.
     */
    const whollyVisible =
      box.y >= 0 &&
      box.x >= 0 &&
      box.x + box.width <= viewport.width &&
      box.y + box.height <= viewport.height
    if (info.measurable && whollyVisible) targets.push({ ...info, handle, box })
  }

  if (targets.length === 0) {
    return { failures: [], worst: { ratio: Infinity, label: null }, examined: 0 }
  }

  /*
   * THE BACKDROP IS THE PAGE WITH ITS GLYPHS REMOVED — not the page with its
   * furniture removed.
   *
   * Getting this definition right took three attempts, and both wrong answers
   * failed in a way that looked like a product defect:
   *
   *   1. Hiding the measured text elements leaked. `visibility: hidden` covered
   *      h1-h3/p/a/span/li, so lucide SVG icons inheriting currentColor stayed
   *      lit and became their neighbours' backdrop. The tell was the reported
   *      colours — #e4e1ee and #c7c4d8 are --color-primary and
   *      --color-secondary. It was measuring text against text.
   *
   *   2. Hiding everything except the scene layer over-corrected. The hero
   *      monogram then measured against the Core BEHIND its own opaque tile,
   *      reporting 1.93:1 for text that sits on solid #2a2933 and is entirely
   *      legible. Opaque surfaces between the text and the scene are real; a
   *      reader sees them.
   *
   * What a reader actually has behind a word is the page minus that word. So
   * the glyphs go transparent and everything else — panels, cards, borders,
   * images, the scene — keeps painting. Icons go too: they are decoration
   * inside a measured box, never the thing whose contrast is in question.
   */
  const BACKDROP_STYLE_ID = 'verify-ui-glyphs-off'
  await page.evaluate((id) => {
    // bg-clip-text headings paint their gradient THROUGH the glyph shapes, so a
    // transparent fill colour is not enough — the gradient is the visible text.
    const clipped = []
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      if (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') {
        el.dataset.verifyClipped = el.style.backgroundImage
        el.style.backgroundImage = 'none'
        clipped.push(el)
      }
    }

    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      *, *::before, *::after {
        color: transparent !important;
        -webkit-text-fill-color: transparent !important;
        text-shadow: none !important;
      }
      svg, svg * { stroke: transparent !important; fill: transparent !important; }
    `
    document.head.appendChild(style)
  }, BACKDROP_STYLE_ID)

  /*
   * Wait for the compositor, not for a stopwatch. A fixed timeout captured a
   * half-painted frame once, so every string was compared against a faded copy
   * of itself. Two nested rAF callbacks resolve after layout and paint.
   */
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
  await page.waitForTimeout(250)

  const backdrop = await page.screenshot({
    clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
  })

  await page.evaluate((id) => {
    document.getElementById(id)?.remove()
    for (const el of document.querySelectorAll('[data-verify-clipped]')) {
      el.style.backgroundImage = el.dataset.verifyClipped ?? ''
      delete el.dataset.verifyClipped
    }
  }, BACKDROP_STYLE_ID)

  const peaks = await page.evaluate(
    async ({ dataUrl, boxes }) => {
      const img = new Image()
      await new Promise((resolve) => {
        img.onload = resolve
        img.src = dataUrl
      })
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const l = (v) => {
        v /= 255
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }

      return boxes.map((b) => {
        const d = ctx.getImageData(
          Math.round(b.x),
          Math.round(b.y),
          Math.max(1, Math.round(b.width)),
          Math.max(1, Math.round(b.height)),
        ).data

        /*
         * The 98th percentile of luminance, not the single brightest pixel.
         *
         * Max was the first choice and it was too aggressive to be useful.
         * The particle field puts a handful of bright 1-2px points anywhere
         * on screen, and one of them landing inside a text box drove the
         * whole measurement: the same heading scored 1.92:1 and 4.36:1 on
         * consecutive runs depending on where the particles had drifted. A
         * two-pixel dot behind a letter is not what makes text unreadable.
         *
         * A high percentile keeps the property that matters — a large bright
         * object behind the text still dominates, because it occupies far
         * more than 2 percent of the box — while sparse points fall out. It
         * is a deliberately strict percentile: this is a legibility floor,
         * not an average-case estimate.
         */
        const lums = new Float64Array(d.length / 4)
        for (let i = 0, j = 0; i < d.length; i += 4, j++) {
          lums[j] = 0.2126 * l(d[i]) + 0.7152 * l(d[i + 1]) + 0.0722 * l(d[i + 2])
        }
        const sorted = Float64Array.from(lums).sort()
        const cutoff = sorted[Math.floor(0.98 * (sorted.length - 1))]

        // The pixel that best represents that luminance, for the report. A
        // ratio with no colour beside it is impossible to act on.
        let px = [0, 0, 0]
        let closest = Infinity
        for (let i = 0, j = 0; i < d.length; i += 4, j++) {
          const gap = Math.abs(lums[j] - cutoff)
          if (gap < closest) {
            closest = gap
            px = [d[i], d[i + 1], d[i + 2]]
          }
        }
        return { max: cutoff, px }
      })
    },
    {
      dataUrl: `data:image/png;base64,${backdrop.toString('base64')}`,
      boxes: targets.map((t) => t.box),
    },
  )

  const lin = (v) => {
    v /= 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

  const failures = []
  let worst = { ratio: Infinity, label: null }

  targets.forEach((t, i) => {
    const peak = peaks[i]
    for (const colour of t.colours) {
      const [r, g, b] = colour.match(/[\d.]+/g).map(Number)
      const ratio = contrast(lum(r, g, b), peak.max)
      if (ratio < worst.ratio) worst = { ratio, label: t.label }
      if (ratio < t.required) {
        const hex = `#${peak.px.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
        failures.push(
          `${t.label} ${colour} on ${hex} = ${ratio.toFixed(2)}:1 (needs ${t.required}:1)`,
        )
      }
    }
  })

  return { failures, worst, examined: targets.length }
}

/* --- run ------------------------------------------------------------------- */

console.log('\nmoin-portfolio — browser verification (Chrome, production build)\n')

const server = await preview({ preview: { port: PORT, strictPort: true } })
const browser = await chromium.launch({ channel: 'chrome' })

let exitCode = 0
try {
  /* --- 1. Preconditions ---------------------------------------------------
   *
   * Asserted before anything else, and fatal.
   *
   * Every check below this point asserts that something is absent or hidden.
   * On a blank page they ALL pass — which is exactly how the Slot crash
   * survived. A render must be proven before an absence means anything.
   */
  section('Preconditions — Home actually rendered')

  // @axe-core/playwright requires a page from an explicit context.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const errors = watch(page)
  const response = await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1200)

  check('HTTP 200', response?.status() === 200, `HTTP ${response?.status()}`)
  check('no page errors or console errors', errors.length === 0, errors.join(' | '))

  const rootSize = (await page.locator('#root').innerHTML()).trim().length
  check('#root is not empty', rootSize > 1000, `${rootSize} bytes`)

  const h1Count = await page.locator('h1').count()
  check('exactly one <h1> (A11Y-02)', h1Count === 1, `${h1Count} found`)
  check(
    '<h1> is the owner name',
    (await page.locator('h1').first().textContent())?.includes('Moin Patel'),
  )

  for (const [label, sel] of [
    ['header', 'header'],
    ['main#main', 'main#main'],
    ['footer', 'footer'],
  ]) {
    check(`${label} landmark present`, (await page.locator(sel).count()) === 1)
  }

  const h2Count = await page.locator('h2').count()
  check('section headings rendered', h2Count >= 4, `${h2Count} <h2>`)

  if (failures.length > 0) {
    console.log(`\n${'─'.repeat(68)}`)
    console.log('ABORTED — Home did not render. Everything below asserts that things')
    console.log('are hidden, and on a blank page all of it would pass.\n')
    for (const f of failures) console.log(`  • ${f}`)
    console.log('')
    exitCode = 1
    throw new Error('preconditions failed')
  }

  await waitForSettled(page)

  /* --- 1b. Invisible text --------------------------------------------------
   *
   * Catches text painted the same colour as whatever is behind it.
   *
   * This exists because the hero role title rendered invisible at every width
   * >= 768px for the entire life of the project: `md:text-base` compiled to
   * `color: var(--color-base)` — the page background — because Tailwind v4
   * resolves `text-*` against --color-* as well as --text-*, and colour wins
   * when a token of each name exists.
   *
   * Nothing else could see it. It typechecks, it lints, the element is in the
   * DOM with the right text, and axe can only report it as `incomplete`
   * ("1:1 contrast ratio") rather than a violation. Only comparing computed
   * colour against computed background finds it.
   */
  section('Render integrity — no text painted its own background colour')

  const invisibleText = await page.evaluate(() => {
    // Walk up for the first non-transparent background, the way a viewer sees it.
    const backgroundBehind = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor
        if (bg && bg !== 'transparent' && !bg.startsWith('rgba(0, 0, 0, 0)')) return bg
      }
      return getComputedStyle(document.body).backgroundColor
    }

    const found = []
    for (const el of document.querySelectorAll('body *')) {
      // Only elements holding their OWN text — otherwise every wrapper reports.
      const ownText = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join('')
      if (!ownText) continue

      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue

      const label = `<${el.tagName.toLowerCase()}> "${ownText.slice(0, 40)}"`

      // 1. Text painted the same colour as what is behind it.
      if (cs.color === backgroundBehind(el)) {
        found.push(`${label} is ${cs.color}, same as its background`)
        continue
      }

      /*
       * 2. Transparent text whose gradient fill never arrived.
       *
       * This case was added because the first one missed a real invisible
       * headline. `text-transparent` + `bg-clip-text` is the standard gradient
       * -text idiom, and it is only safe while the gradient actually has
       * colour. Written as `from-[--color-primary]`, Tailwind v4 does not
       * resolve the bare custom property: it compiled to rgba(0,0,0,0), so the
       * fill was transparent, the text was transparent, and the entire hero
       * headline rendered as blank space — while check 1 passed, because
       * transparent never equals the background colour.
       */
      /*
       * Alpha-0 only, and it must be the FOUR-component rgba() form.
       *
       * This previously used a pattern where the leading [^)]* swallowed the
       * first two channels, so rgb(0,0,0) matched the trailing ",0)" and pure
       * black was reported as transparent text. It never surfaced while the
       * palette was light-on-dark; it fired on 42 elements the moment body
       * text became #000000.
       *
       * Narrowed to exactly rgba() with four components and a zero alpha —
       * which is precisely what the check exists to catch. This removes a
       * false positive without weakening the assertion.
       */
      const transparent = /^rgba\(\d+,\d+,\d+,0(\.0+)?\)$/.test(cs.color.replace(/\s/g, ""))
      if (transparent) {
        if (cs.backgroundClip !== 'text' && cs.webkitBackgroundClip !== 'text') {
          found.push(`${label} is transparent with no background-clip:text`)
          continue
        }
        // Any fully-transparent stop makes the clipped fill invisible.
        const stops = cs.backgroundImage.match(/rgba?\([^)]+\)/g) ?? []
        const allTransparent =
          stops.length === 0 ||
          stops.every((s) => /,\s*0\s*\)$/.test(s.replace(/\s/g, '').replace(/,0\)$/, ',0)')))
        if (allTransparent) {
          found.push(`${label} uses bg-clip-text but its gradient has no colour`)
        }
      }
    }
    return found
  })

  check(
    'no element renders text in its own background colour',
    invisibleText.length === 0,
    invisibleText.join(' | '),
  )

  /*
   * The ambient layer contributes visible pixels.
   *
   * WHY THIS EXISTS
   *
   * Phase 2 mounted the WebGL scene and every check in this suite passed: the
   * chunk was requested, the canvas existed at the right size, no page errors,
   * the budget fitted, axe was clean. The scene was also completely invisible.
   * `body` carried an opaque `background-color`, and a body background is a
   * block background — painted AFTER negative-z-index descendants, straight
   * over the `z-index: -10` ambient layer.
   *
   * It had been true since the design system landed, so the CSS blob field had
   * never been seen either. Nothing could detect it, because every check asked
   * whether the layer EXISTED and the answer was honestly yes.
   *
   * So this asks the only question that distinguishes the two: does removing
   * the layer change what the page looks like? Screenshot with it, screenshot
   * without it, compare. A layer painted over cannot pass, because hiding
   * something already invisible changes nothing.
   *
   * The comparison is on raw pixels, not file size — PNG bytes vary with
   * compression and a threshold on them would be a proxy for the wrong thing.
   */
  const sceneLayerVisible = await (async () => {
    const clip = { x: 400, y: 200, width: 480, height: 480 }
    const before = await page.screenshot({ clip })
    await page.evaluate(() => {
      const layer = document.querySelector('[data-scene-container]')
      if (layer) layer.style.visibility = 'hidden'
    })
    await page.waitForTimeout(300)
    const after = await page.screenshot({ clip })
    await page.evaluate(() => {
      const layer = document.querySelector('[data-scene-container]')
      if (layer) layer.style.visibility = ''
    })
    await page.waitForTimeout(300)
    return { changed: Buffer.compare(before, after) !== 0, size: before.length }
  })()

  check(
    'ambient/3D layer is actually visible (not painted over)',
    sceneLayerVisible.changed,
    'hiding [data-scene-container] changed nothing on screen — the layer renders but ' +
      'something opaque is painted over it (check for a background-color on body)',
  )

  /*
   * WCAG 1.4.3 for text sitting over the 3D scene.
   *
   * axe cannot do this one. Every node above the canvas comes back as
   * "could not evaluate — needs manual review", because axe resolves a
   * backdrop by walking CSS backgrounds up the tree and a WebGL canvas has no
   * CSS colour to find. The suite has been printing 100+ such nodes on Home as
   * a note for weeks; the moment a bright object rendered behind the headline
   * those notes stopped being noise and started being the exact place a
   * failure could hide.
   *
   * So this measures the composited pixels instead of asking the CSSOM:
   *   1. find visible text that overlaps the scene layer
   *   2. hide it and screenshot what is actually behind it
   *   3. take the WORST (brightest) backdrop pixel in that box
   *   4. compare against the text's own colour — or, for `bg-clip-text`
   *      headings, against every gradient stop, since the pale end of a
   *      gradient is the half that fails and the computed `color` on those
   *      elements is `transparent`
   *
   * Worst pixel rather than average on purpose. Average contrast is not a
   * thing a reader experiences; the letters crossing the bright part of the
   * sphere are either legible or they are not.
   */
  /*
   * Both viewports, because the failure is width-dependent (see the helper).
   * Desktop first — the page is already at 1280x900 and the rest of this
   * section depends on that — then mobile, then back.
   */
  for (const vp of [
    { width: 1280, height: 900, label: 'desktop 1280x900' },
    { width: 390, height: 844, label: 'mobile 390x844' },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    // The canvas resizes with the viewport and the scene needs a frame or two
    // to settle before its pixels mean anything.
    await page.waitForTimeout(1200)

    /*
     * SAMPLED THROUGH THE SCROLL, not only at the top.
     *
     * Phase 4 made the Core travel. Until then it lived in the hero and a
     * top-of-page measurement covered everything it could sit behind; now it
     * moves across the whole document and a check pinned to progress 0 measures
     * the one position that was already known to be safe. The first run of this
     * loop found failures at three separate scroll bands that the previous
     * version reported as a clean pass.
     */
    /*
     * SAMPLED WHERE THE SECTIONS ARE, not at fixed percentages of the document.
     *
     * The earlier version stepped through 0/15/30/45/60/80/100% of scroll,
     * which is the same assumption the timeline itself used to make and the
     * same one that turned out to be wrong: the homepage is not seven chapters,
     * it also carries Impact, Experience, Skills and Education. A percentage
     * grid samples wherever those happen to land and can walk straight past the
     * section a chapter is actually choreographed for.
     *
     * So the positions come from the DOM: the middle of every narrative
     * section, the middle of every non-narrative one, plus the top and bottom.
     * That covers each chapter at its most active AND the stretches where the
     * Core is only supposed to be holding its calm state — which is exactly
     * where the failures were.
     */
    const samples = await page.evaluate(() => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const points = [{ label: 'top', y: 0 }]

      const seen = new Set()
      for (const el of document.querySelectorAll('[data-chapter], main section[id]')) {
        const id = el.getAttribute('data-chapter') ?? el.getAttribute('id')
        if (!id || seen.has(id)) continue
        seen.add(id)
        const rect = el.getBoundingClientRect()
        const centre = rect.top + window.scrollY + rect.height / 2 - window.innerHeight / 2
        points.push({
          label: (el.hasAttribute('data-chapter') ? 'ch:' : '') + id,
          y: Math.min(maxScroll, Math.max(0, centre)),
        })
      }

      points.push({ label: 'bottom', y: maxScroll })
      return points
    })

    const worstByPosition = []
    for (const sample of samples) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), sample.y)
      // The scene damps toward its target over 0.6s (motion spec section 3.4),
      // so measuring immediately would sample a state the reader never rests on.
      await page.waitForTimeout(1800)

      const overlay = await measureOverlayContrast(page)
      worstByPosition.push({ sample, overlay })
      check(
        `text over the 3D scene meets WCAG 1.4.3 (${vp.label} @ ${sample.label})`,
        overlay.failures.length === 0,
        overlay.failures.slice(0, 3).join(' | '),
      )
    }

    const worst = worstByPosition.reduce((a, b) =>
      b.overlay.worst.ratio < a.overlay.worst.ratio ? b : a,
    )
    notes.push(
      `scene overlay contrast (${vp.label}): ${samples.length} section-aligned positions; worst ${worst.overlay.worst.ratio === Infinity ? 'n/a' : `${worst.overlay.worst.ratio.toFixed(2)}:1 on ${worst.overlay.worst.label}`} at ${worst.sample.label}`,
    )

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.waitForTimeout(600)
  }
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.waitForTimeout(400)

  /* --- 2. Empty-database render (Phase 8 exit criterion) ------------------ */
  section('Empty-database render — 12.3 / 12.6 / 12.9 / 12.12')

  const sectionIds = await page.evaluate(() =>
    [...document.querySelectorAll('section[id]')].map((s) => s.id),
  )
  notes.push(`Home sections rendered: ${sectionIds.join(', ')}`)

  /*
   * 12.3 — About renders only when there is real copy for it.
   *
   * Asserted against the data as it IS, for the same reason as 12.6 below: this
   * previously hardcoded "About is absent", which held only while `short_bio`
   * was null. Populating it from the resume turned a correct render into a
   * failing check. An assertion that has to be edited whenever real content
   * arrives will eventually be edited to match a bug.
   *
   * Both directions are still checked — an About section with no prose in it
   * would fail, which is the actual 12.3 requirement (hide, never render a
   * placeholder).
   */
  const aboutPresent = sectionIds.includes('about')
  if (aboutPresent) {
    const aboutProse = await page.evaluate(
      () => document.querySelector('section#about')?.textContent?.trim().length ?? 0,
    )
    check('12.3: About renders with real prose', aboutProse > 120, `${aboutProse} chars`)
    notes.push(`About section is rendering (${aboutProse} chars of copy).`)
  } else {
    check('12.3: About is absent because short_bio is empty', true)
  }

  /*
   * 12.6 — asserted against whatever the database actually contains, not
   * against a state assumed at the time this was written.
   *
   * This check used to hardcode "the section is absent", which was true only
   * while every project was a draft. The moment the three seeded projects were
   * published it failed — not because the product regressed, but because the
   * assertion had gone stale. A suite that has to be edited whenever real data
   * changes will eventually be edited to match a bug.
   *
   * So: count the cards, then assert the contract for that count.
   */
  const featuredCardCount = await page.locator('#featured-projects article').count()
  const featuredPresent = sectionIds.includes('featured-projects')

  if (featuredCardCount === 0) {
    check('12.6: no published projects, so Featured Projects hides entirely', !featuredPresent)
  } else {
    check('12.6: Featured Projects renders published projects', featuredPresent)
    check(
      '12.6: every featured card links to its case study',
      await page.evaluate(() => {
        const cards = [...document.querySelectorAll('#featured-projects article')]
        return (
          cards.length > 0 &&
          cards.every((c) => c.querySelector('a[href*="/projects/"], a[href^="http"]'))
        )
      }),
      `${featuredCardCount} card(s)`,
    )
    notes.push(`Featured Projects is rendering ${featuredCardCount} published project card(s).`)
  }

  check('12.9: Education renders (one published record)', sectionIds.includes('education'))
  check('Skills renders', sectionIds.includes('skills'))
  /*
   * Was: 'What I Build renders' asserting a #what-i-build section.
   *
   * That section was deliberately replaced by Capabilities (spec §9: AI /
   * AUTOMATION / DATA / SYSTEMS). Both answered "what does he build", so
   * running the two said the same thing twice in one scroll. The assertion is
   * retargeted rather than deleted — the requirement that a static
   * capability block renders on Home still holds, only its id changed.
   */
  check('Capabilities renders (static content)', sectionIds.includes('capabilities'))

  // The two new narrative chapters, spec §8 and §12.
  check('Introduction chapter renders', sectionIds.includes('introduction'))
  check('Process chapter renders', sectionIds.includes('process'))
  check('Impact renders (static content)', sectionIds.includes('impact'))

  // 12.12 — no avatar means a monogram tile, never a broken image.
  check(
    '12.12: no broken <img> in the hero (monogram fallback)',
    await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')]
      return imgs.every((i) => i.complete && i.naturalWidth > 0)
    }),
  )

  // Q-20 — availability_label is null, so the pill must not render.
  check(
    'availability pill absent (availability_label is null)',
    (await page.getByText(/available for work/i).count()) === 0,
  )

  /* --- 3. Responsive — RES-12 / 41.6 -------------------------------------- */
  section(`Responsive — Home at ${WIDTHS.length} widths (RES-12)`)

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(250)

    const ok = await noHorizontalOverflow(page, width)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    check(`${width}px: no horizontal overflow`, ok, `scrollWidth ${scrollWidth}`)

    const desktopNavVisible = await page.locator('nav[aria-label="Primary"]').isVisible()
    const triggerVisible = await page.locator(TRIGGER).isVisible()

    if (width < MOBILE_BREAKPOINT) {
      check(`${width}px: hamburger shown, desktop nav hidden`, triggerVisible && !desktopNavVisible)
    } else {
      check(`${width}px: desktop nav shown, hamburger hidden`, desktopNavVisible && !triggerVisible)
    }
  }

  /* --- 4. FR-NAV-02 — observed behaviour ---------------------------------- */
  section('FR-NAV-02 — mobile navigation sheet at 390px')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(250)

  const trigger = page.locator(TRIGGER)
  check(
    'trigger: aria-expanded="false", no aria-controls while closed',
    (await trigger.getAttribute('aria-expanded')) === 'false' &&
      (await trigger.getAttribute('aria-controls')) === null,
  )

  await trigger.click()
  await page.waitForSelector(DIALOG, { state: 'visible' })
  await page.waitForTimeout(350)

  const dialog = page.locator(DIALOG)
  check(
    'trigger: aria-expanded="true", aria-controls points at the panel',
    (await trigger.getAttribute('aria-expanded')) === 'true' &&
      (await trigger.getAttribute('aria-controls')) === PANEL_ID,
  )
  check('dialog has role="dialog"', (await dialog.getAttribute('role')) === 'dialog')

  const accessibleName = await dialog.evaluate((d) => {
    const id = d.getAttribute('aria-labelledby')
    return id ? (document.getElementById(id)?.textContent?.trim() ?? null) : null
  })
  check('A11Y-11: dialog is labelled ("Menu")', accessibleName === 'Menu', String(accessibleName))

  /*
   * A11Y-11 asks for aria-modal="true". Radix instead marks everything outside
   * the dialog aria-hidden, which the WAI-ARIA practices treat as the more
   * robust technique (aria-modal support is uneven). The requirement's INTENT
   * — background content unreachable by assistive tech — is what is asserted
   * here; the literal attribute is reported as a deviation.
   */
  const backgroundHidden = await page.evaluate(() => {
    let el = document.querySelector('button[aria-label="Open navigation menu"]')
    while (el) {
      if (el.getAttribute?.('aria-hidden') === 'true') return true
      el = el.parentElement
    }
    return false
  })
  check('A11Y-11: background content is hidden from assistive tech', backgroundHidden)
  if ((await dialog.getAttribute('aria-modal')) !== 'true') {
    notes.push(
      'A11Y-11 literal deviation: Radix omits aria-modal="true" and hides background ' +
        'content with aria-hidden instead. Intent met; attribute absent.',
    )
  }

  const dialogLinks = await dialog.locator('a').allTextContents()
  const normalised = dialogLinks.map((t) => t.trim())
  check(
    `all ${NAV_LABELS.length} nav links present in the sheet`,
    NAV_LABELS.every((l) => normalised.includes(l)),
    normalised.join(', '),
  )
  check(
    'primary CTA present in the sheet',
    normalised.some((t) => /Let.s Talk/i.test(t)),
  )

  // Scroll lock — mechanism confirmed by inspection before being asserted:
  // react-remove-scroll sets body overflow:hidden and data-scroll-locked.
  const lockedState = await page.evaluate(() => ({
    overflow: getComputedStyle(document.body).overflow,
    marker: document.body.hasAttribute('data-scroll-locked'),
  }))
  check(
    'body scroll is locked while open',
    lockedState.overflow === 'hidden' && lockedState.marker,
    JSON.stringify(lockedState),
  )

  check('no horizontal overflow with the sheet open', await noHorizontalOverflow(page, 390))

  // Focus trap — assert containment rather than an exact tab order, which
  // depends on Radix internals.
  await page.keyboard.press('Tab')
  let escaped = null
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab')
    const inside = await page.evaluate(
      (id) => document.getElementById(id)?.contains(document.activeElement) ?? false,
      PANEL_ID,
    )
    if (!inside) {
      escaped = i
      break
    }
  }
  check(
    'focus is trapped inside the sheet (15 tabs)',
    escaped === null,
    `escaped on tab ${escaped}`,
  )

  await page.keyboard.press('Escape')
  await page.waitForSelector(DIALOG, { state: 'detached' })
  await page.waitForTimeout(400) // Radix restores focus after unmount
  check('Escape closes the sheet', (await page.locator(DIALOG).count()) === 0)
  check(
    'focus returns to the trigger after close',
    await page.evaluate((sel) => document.activeElement === document.querySelector(sel), TRIGGER),
  )
  check(
    'body scroll lock released after close',
    (await page.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden',
  )

  /*
   * Backdrop dismissal — FR-NAV-02 names it explicitly.
   *
   * Two separate things are measured, because they fail for different reasons
   * and collapsing them into one boolean hides which one is broken:
   *
   *   reachable — can a pointer anywhere on screen actually land on the
   *               overlay? `elementFromPoint` answers this honestly; asserting
   *               on the DOM alone would say yes while the user sees no.
   *   dismisses — does a pointerdown on the overlay close the sheet?
   */
  await trigger.click()
  await page.waitForSelector(DIALOG, { state: 'visible' })
  await page.waitForTimeout(300)

  const overlayCount = await page.locator(OVERLAY).count()
  const hitTest = await page.evaluate(() => {
    // Corners and edge midpoints — anywhere a user might aim for "outside".
    const w = window.innerWidth,
      h = window.innerHeight
    const points = [
      [2, 2],
      [w - 2, 2],
      [2, h - 2],
      [w - 2, h - 2],
      [w / 2, 2],
      [2, h / 2],
    ]
    return points.some(([x, y]) =>
      String(document.elementFromPoint(x, y)?.className ?? '').includes('backdrop-blur'),
    )
  })

  await page.locator(OVERLAY).dispatchEvent('pointerdown')
  await page.waitForTimeout(400)
  const dismisses = (await page.locator(DIALOG).count()) === 0

  /*
   * FR-NAV-02 asks for backdrop dismissal; RES-01 asks for a full-screen
   * sheet. `fixed inset-0` content covers the overlay completely, so the two
   * cannot both hold. Ruled by the product owner in favour of RES-01.
   *
   * Still measured every run rather than deleted: if the sheet ever stops
   * being full-screen, `reachable` flips to true and the ruling's premise no
   * longer holds — at which point this needs revisiting, and a deleted check
   * would never tell anyone.
   */
  deviation(
    'backdrop dismissal (FR-NAV-02)',
    `overlay in DOM=${overlayCount === 1}, reachable by pointer=${hitTest}, ` +
      `pointerdown dismisses=${dismisses}`,
    'RES-01 (full-screen sheet) wins over FR-NAV-02 backdrop dismissal — owner ' +
      'decision. Dialog.Content is `fixed inset-0`, so no backdrop region is ' +
      'reachable. Esc, the close button and link-click are the exits, all verified above.',
  )
  if (await page.locator(DIALOG).count()) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }

  // Link click must navigate AND close.
  if (await page.locator(DIALOG).count()) await page.keyboard.press('Escape')
  await trigger.click()
  await page.waitForSelector(DIALOG, { state: 'visible' })
  // Retargeted from 'Skills' to 'Capabilities' — same destination (/skills),
  // renamed label. The assertion still checks that a link navigates AND closes.
  await page.locator(`${DIALOG} a`, { hasText: 'Capabilities' }).first().click()
  await page.waitForTimeout(700)
  check(
    'clicking a link navigates and closes the sheet',
    page.url().endsWith('/skills') && (await page.locator(DIALOG).count()) === 0,
    `url ${page.url()}`,
  )

  /* --- 5. axe — 41.5 ------------------------------------------------------- */
  section('Accessibility — axe-core on Home (41.5)')

  await page.goto(BASE, { waitUntil: 'load' })
  await waitForSettled(page)

  /*
   * Reports NODES, not just rules.
   *
   * This previously printed `violations.length` and the first three targets.
   * That reported the real state of Home as "1 violation" when it was 17
   * failing elements arising from two unrelated root causes — 15 from
   * --color-muted and 2 from white-on-accent. Fixing the first would have left
   * the check red with no indication that the remainder was a different bug.
   *
   * Nodes are grouped by their measured colour pair so one root cause reads as
   * one line instead of twelve identical ones. `incomplete` is surfaced too:
   * axe could not evaluate those, which is not the same as their passing.
   *
   * This only makes failures more legible. No threshold and no assertion
   * changed — the check is still zero critical/serious.
   */
  const runAxe = async (label) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact))
    const nodeCount = serious.reduce((n, v) => n + v.nodes.length, 0)

    check(
      `${label}: zero critical/serious violations`,
      serious.length === 0,
      `${nodeCount} node(s) across ${serious.length} rule(s): ${serious.map((v) => v.id).join(', ')}`,
    )

    for (const v of serious) {
      console.log(`      [${v.impact}] ${v.id} — ${v.nodes.length} node(s): ${v.help}`)

      // Collapse identical measurements; colour-contrast in particular repeats
      // the same fg/bg pair across every caption on the page.
      const grouped = new Map()
      for (const node of v.nodes) {
        const d = node.any?.[0]?.data ?? {}
        const key =
          d.contrastRatio !== undefined
            ? `${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}:1 (${d.fontSize}, ${d.fontWeight})`
            : node.target.join(' ')
        const entry = grouped.get(key) ?? { count: 0, sample: node.target.join(' ') }
        entry.count += 1
        grouped.set(key, entry)
      }
      for (const [key, { count, sample }] of grouped) {
        console.log(`         ${String(count).padStart(2)}x  ${key}`)
        if (key !== sample) console.log(`             e.g. ${sample}`)
      }
    }

    const minor = results.violations.filter((v) => !['critical', 'serious'].includes(v.impact))
    if (minor.length > 0) {
      notes.push(
        `${label}: ${minor.length} minor/moderate axe finding(s) — ${minor.map((v) => v.id).join(', ')}`,
      )
    }

    // Not passes: axe declined to judge these (text over gradients or images).
    const incomplete = results.incomplete.reduce((n, i) => n + i.nodes.length, 0)
    if (incomplete > 0) {
      notes.push(
        `${label}: ${incomplete} node(s) axe could NOT evaluate (needs manual review) — ` +
          results.incomplete.map((i) => `${i.id}:${i.nodes.length}`).join(', '),
      )
    }
  }

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.waitForTimeout(300)
  await runAxe('Home, desktop')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  await page.locator(TRIGGER).click()
  await page.waitForSelector(DIALOG, { state: 'visible' })
  await page.waitForTimeout(400)
  await runAxe('Home, mobile sheet open')

  /* --- 6. Phase 16 breadth — 41.5 / 41.6 across the other public routes ----
   *
   * Home was the Phase 8 exit criterion. These are Phase 16, and they were
   * blocked until real projects were published: an empty /projects renders an
   * empty state, so axe and the width matrix would have been measuring a page
   * the public will never see. That is the same absence-passes-for-the-wrong-
   * reason trap the preconditions above exist to prevent, so each route
   * asserts it actually rendered BEFORE anything else is believed.
   */
  section('Phase 16 — the remaining public routes')

  const ROUTES = [
    { path: '/projects', label: 'Projects index', expect: 'h1' },
    { path: '/projects/exam-build-platform', label: 'Case study', expect: 'h1' },
    { path: '/contact', label: 'Contact', expect: 'form' },
    { path: '/about', label: 'About', expect: 'h1' },
    { path: '/experience', label: 'Experience', expect: 'h1' },
    { path: '/skills', label: 'Skills', expect: 'h1' },
    { path: '/resume', label: 'Resume', expect: 'h1' },
  ]

  // A narrower matrix than Home's eight: these routes share the same layout
  // primitives, so the value is in the breakpoints either side of the nav
  // switch and the narrowest real phone.
  const BREADTH_WIDTHS = [1440, 1024, 768, 375]

  for (const route of ROUTES) {
    await page.setViewportSize({ width: 1280, height: 900 })
    const routeErrors = []
    const onError = (e) => routeErrors.push(String(e.message).split('\n')[0])
    page.on('pageerror', onError)

    const response = await page.goto(`${BASE}${route.path}`, { waitUntil: 'load' })
    await waitForSettled(page)
    /*
     * Wait for the route's own marker, not just for loading regions to clear.
     *
     * `waitForSettled` returns immediately when a page's skeleton does not set
     * `aria-busy`, which is true of the case study and /resume. Asserting at
     * that moment read both as "did not render" when they render perfectly a
     * second later — a false failure, which erodes trust in the suite exactly
     * as fast as a false pass.
     */
    await page.waitForSelector(route.expect, { timeout: 15000 }).catch(() => {})

    const rendered =
      response?.status() === 200 &&
      (await page.locator(route.expect).count()) > 0 &&
      (await page.locator('#root').innerHTML()).trim().length > 1000

    check(`${route.label} (${route.path}) renders`, rendered, `HTTP ${response?.status()}`)
    check(
      `${route.label}: no uncaught page errors`,
      routeErrors.length === 0,
      routeErrors.join(' | '),
    )

    if (rendered) {
      for (const width of BREADTH_WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.waitForTimeout(200)
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        check(
          `${route.label} @ ${width}px: no horizontal overflow`,
          scrollWidth <= width + 1,
          `scrollWidth ${scrollWidth}`,
        )
      }

      await page.setViewportSize({ width: 1280, height: 900 })
      await page.waitForTimeout(200)
      await runAxe(route.label)
    }

    page.off('pageerror', onError)
  }

  await context.close()

  /* --- 7. PERF-05 — JavaScript budgets ------------------------------------
   *
   * Runs last: it opens its own contexts and needs the rest of the suite to
   * have already proven these routes render. A budget measured against a blank
   * page is the cheapest possible pass and means nothing.
   *
   * Every measurement prints whether it passes or fails. A budget you can only
   * see when it breaks gives no warning that you are at 179 of 180.
   */
  section('PERF-05 — JavaScript budgets (gzipped)')

  const BUDGET_ROUTES = [
    { path: '/', label: 'Home' },
    { path: '/projects', label: 'Projects index' },
    { path: '/projects/exam-build-platform', label: 'Case study' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
    { path: '/resume', label: 'Resume' },
  ]

  const measured = []
  for (const route of BUDGET_ROUTES) {
    const result = await measureRoute(browser, route.path)
    measured.push({ ...route, ...result })
    if (result.missing.length) {
      // Not a product failure — the harness could not read what it measured, so
      // the total it reports is an undercount. Say so rather than let a
      // silently-too-small number pass a budget.
      notes.push(
        `budget: ${result.chunks.size - result.missing.length}/${result.chunks.size} chunks ` +
          `readable for ${route.label}; total is an undercount (${result.missing.join(', ')})`,
      )
    }
  }

  /*
   * SHARED SHELL — chunks present on EVERY measured route.
   *
   * Computed before anything is asserted, because route-specific weight is
   * defined as a subtraction from it and the two numbers must come from one
   * measurement rather than two passes that could disagree.
   */
  const shellChunks = [...(measured[0]?.chunks ?? [])].filter((chunk) =>
    measured.every((m) => m.chunks.has(chunk)),
  )
  let sharedShellKb = 0
  for (const chunk of shellChunks) {
    try {
      sharedShellKb += gzipSync(await readFile(path.join(DIST, chunk))).byteLength
    } catch {
      /* already reported as a note above */
    }
  }
  sharedShellKb = kb(sharedShellKb)

  console.log(`\n      SHARED_SHELL_GZIP_BUDGET_KB   = ${SHARED_SHELL_GZIP_BUDGET_KB}`)
  console.log(`      ROUTE_SPECIFIC_GZIP_BUDGET_KB = ${ROUTE_SPECIFIC_GZIP_BUDGET_KB}`)
  console.log(
    `      HOME_TOTAL_GZIP_BUDGET_KB     = ${HOME_TOTAL_GZIP_BUDGET_KB}` +
      `   (Home only — the 3D scene is lazy)\n`,
  )
  console.log(
    `      ${'route'.padEnd(16)} ${'total'.padStart(8)} ${'= shell'.padStart(9)}` +
      ` + ${'route-specific'.padStart(14)}   chunks`,
  )

  for (const m of measured) {
    m.totalKb = kb(m.bytes)
    // The subtraction is exact, not approximate: shellChunks is a subset of
    // every route's chunk set by construction, so this is the gzipped weight of
    // the chunks unique to this route.
    m.routeSpecificKb = Math.round((m.totalKb - sharedShellKb) * 100) / 100
    console.log(
      `      ${m.label.padEnd(16)} ${String(m.totalKb).padStart(8)} ${String(sharedShellKb).padStart(9)}` +
        `   ${String(m.routeSpecificKb).padStart(14)}   ${String(m.chunks.size).padStart(2)}` +
        `${m.path === '/' ? '   ← HOME_TOTAL applies' : ''}`,
    )
  }
  console.log('')

  /* Acceptance criterion 1 — the shared shell. */
  check(
    `SHARED_SHELL_GZIP within ${SHARED_SHELL_GZIP_BUDGET_KB} KB budget`,
    shellChunks.length > 0 && sharedShellKb <= SHARED_SHELL_GZIP_BUDGET_KB,
    shellChunks.length === 0
      ? 'no chunk common to all routes — the measurement is wrong, not the bundle'
      : `measured ${sharedShellKb} KB across ${shellChunks.length} shared chunks`,
  )

  /*
   * Acceptance criterion 2 — route-specific weight, every route except Home.
   *
   * Home is exempt from this one and asserted against HOME_TOTAL below. The
   * exemption is stated in its own check name rather than by silently skipping
   * Home, so a reader of the output can see that a route was treated
   * differently and why.
   */
  for (const m of measured.filter((m) => m.path !== '/')) {
    check(
      `${m.label}: ROUTE_SPECIFIC_GZIP within ${ROUTE_SPECIFIC_GZIP_BUDGET_KB} KB budget`,
      m.routeSpecificKb <= ROUTE_SPECIFIC_GZIP_BUDGET_KB,
      `measured ${m.routeSpecificKb} KB above the ${sharedShellKb} KB shared shell`,
    )
  }

  const home = measured.find((m) => m.path === '/')
  check(
    `Home: HOME_TOTAL_GZIP within ${HOME_TOTAL_GZIP_BUDGET_KB} KB budget ` +
      `(exempt from ROUTE_SPECIFIC — lazy 3D scene)`,
    home !== undefined && home.totalKb <= HOME_TOTAL_GZIP_BUDGET_KB,
    `measured ${home?.totalKb ?? 0} KB total, of which ${home?.routeSpecificKb ?? 0} KB is route-specific`,
  )
} catch (error) {
  if (String(error.message) !== 'preconditions failed') {
    failures.push(`unexpected exception: ${String(error?.message ?? error)}`)
    console.log(`\n  ✗ unexpected exception: ${String(error?.message ?? error)}`)
  }
} finally {
  await browser.close().catch(() => {})
  await new Promise((resolve) => server.httpServer.close(resolve))
}

/* --- report ---------------------------------------------------------------- */

console.log(`\n${'─'.repeat(68)}`)
for (const note of notes) console.log(`  note: ${note}`)
if (notes.length) console.log('')

// Repeated in the tail so a green run can never be read as "everything the PRD
// asks for is met" — one requirement is met by ruling, not by behaviour.
if (deviations.length) {
  for (const d of deviations) console.log(`  ACCEPTED DEVIATION — ${d.name}: ${d.ruling}`)
  console.log('')
}

if (failures.length === 0 && exitCode === 0) {
  console.log(
    `PASS — ${passed} browser checks, 0 failures` +
      `${deviations.length ? `, ${deviations.length} accepted deviation(s)` : ''}.`,
  )
  console.log('Scope: all public routes. Admin screens need a signed-in session and')
  console.log('are covered by db:verify:auth instead.')
} else {
  console.log(`FAIL — ${passed} passed, ${failures.length} failed:\n`)
  for (const f of failures) console.log(`  • ${f}`)
  exitCode = 1
}
console.log('')
process.exitCode = exitCode
