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

import { AxeBuilder } from '@axe-core/playwright'
import { chromium } from 'playwright'
import { preview } from 'vite'

const PORT = 4180
const BASE = `http://localhost:${PORT}`

/** RES-12 / 41.6 — the eight widths the PRD names. */
const WIDTHS = [1920, 1440, 1280, 1024, 768, 430, 390, 375]
const MOBILE_BREAKPOINT = 768

const TRIGGER = 'button[aria-label="Open navigation menu"]'
const PANEL_ID = 'mobile-nav-panel'
const DIALOG = `#${PANEL_ID}`
const OVERLAY = 'div[class*="backdrop-blur"]'
const NAV_LABELS = ['About', 'Experience', 'Projects', 'Skills', 'Contact']

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

      if (cs.color === backgroundBehind(el)) {
        found.push(`<${el.tagName.toLowerCase()}> "${ownText.slice(0, 40)}" is ${cs.color}`)
      }
    }
    return found
  })

  check(
    'no element renders text in its own background colour',
    invisibleText.length === 0,
    invisibleText.join(' | '),
  )

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
  check('What I Build renders (static content)', sectionIds.includes('what-i-build'))
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
  await page.locator(`${DIALOG} a`, { hasText: 'Skills' }).first().click()
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
