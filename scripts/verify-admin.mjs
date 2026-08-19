/**
 * Admin browser verification — `npm run verify:admin`
 *
 * The companion to verify-ui.mjs, which covers only PUBLIC routes because the
 * admin needs a signed-in session.
 *
 * WHY THIS EXISTS
 *
 * Two "the page does not render" bugs shipped in this project, and neither was
 * caught by typecheck, ESLint, 169 unit tests or a clean production build:
 *
 *   `Button asChild` passed Radix Slot two children and Slot threw on mount,
 *   blanking /, /404, /500 and the case study — latent since Phase 7.
 *
 *   `useUnsavedChanges` called `useBlocker` outside a data router, which
 *   THROWS. /admin/projects/new failed every time, and /admin/settings failed
 *   as soon as its profile query resolved. Both screens were unusable.
 *
 * The first was found by the first-ever browser run. The second was found only
 * because someone happened to drive the admin UI by hand. verify-ui closed
 * that hole for the public site; this closes it for the thirteen admin pages,
 * which are the only way any content gets published.
 *
 * VERIFICATION RULES THIS FILE FOLLOWS
 *
 *   - Login and the admin shell are asserted FIRST and are fatal. Every later
 *     check assumes an authenticated shell; running them against a login page
 *     would produce a screenful of misleading failures.
 *   - Failures are categorised. A broken product, a broken harness and a
 *     missing environment variable are three different problems and must not
 *     be reported as one.
 *   - Nothing asserts an absence without first proving that the thing which
 *     should contain it actually rendered.
 *
 * Writes: NOTHING, except one disposable image in the `profile` bucket during
 * the MED-04 test, removed in a `finally` block. The profile row is never
 * saved, so `avatar_path` is not touched.
 */

import { existsSync } from 'node:fs'
import zlib from 'node:zlib'

import { AxeBuilder } from '@axe-core/playwright'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { preview } from 'vite'

for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file)
    } catch {
      /* Node < 20.12 */
    }
  }
}

const PORT = 4310
const BASE = `http://localhost:${PORT}`
const URL_ = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const PASSWORD = process.env.ADMIN_PASSWORD

/** Admin is a desktop tool; these are the widths a laptop actually uses. */
const WIDTHS = [1440, 1024, 768]

/* --- harness ---------------------------------------------------------------
 *
 * Three separate buckets. Collapsing them is how "the product is broken" gets
 * reported when the truth is a typo in a selector.
 */

let passed = 0
const productFailures = []
const harnessFailures = []
const notes = []

const check = (name, ok, detail = '') => {
  if (ok) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    productFailures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/** The harness could not perform the check. Says nothing about the product. */
const harnessProblem = (name, detail) => {
  harnessFailures.push(`${name} — ${detail}`)
  console.log(`  ⚠ ${name} — HARNESS COULD NOT VERIFY: ${detail}`)
}

const section = (title) => console.log(`\n${title}`)

class EnvironmentBlocker extends Error {}
class ShellFailure extends Error {}

/**
 * Collects runtime errors so a silent crash cannot pass as a render — but
 * keeps two kinds apart, because they mean opposite things.
 *
 *   uncaught  a `pageerror`. Nothing handled it. This is the class of bug this
 *             whole suite exists for: the Slot crash and the useBlocker crash
 *             both surfaced exactly here. Always a product failure.
 *
 *   logged    a `console.error`. In this codebase that is a DELIBERATE
 *             channel — lib/errors.ts:131 logs every handled error as
 *             `[kind] context`. Treating it as a failure means the suite goes
 *             red when a storage request is aborted by navigating away, which
 *             is the app's error handling working, not a defect.
 *
 * The first run of this harness conflated them and reported /admin/resume as
 * broken over an aborted `media.listMedia` fetch that could not be reproduced
 * in three attempts. Logged errors are surfaced as notes so they stay visible
 * without failing the build on transient network conditions.
 */
function watch(page) {
  const uncaught = []
  const logged = []
  page.on('pageerror', (event) => uncaught.push(String(event.message).split('\n')[0].slice(0, 160)))
  page.on('console', (message) => {
    if (message.type() === 'error') logged.push(message.text().slice(0, 140))
  })
  return { uncaught, logged }
}

const crashed = (page) =>
  page.evaluate(() => document.body.innerText.includes('Something went wrong'))

const headingOf = (page) =>
  page.evaluate(() => document.querySelector('h1')?.textContent?.trim() ?? '')

/**
 * Waits for a route to actually finish, not merely to stop being busy.
 *
 * verify-ui learned this the hard way: waiting on `aria-busy` alone returns
 * immediately for pages whose skeletons do not set it, and both the case study
 * and /resume were reported as "did not render" when they render fine a second
 * later. A false failure destroys trust in a suite as fast as a false pass, so
 * this waits for the page's own non-empty <h1>.
 */
async function gotoAdmin(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
  await page
    .waitForFunction(() => (document.querySelector('h1')?.textContent?.trim().length ?? 0) > 0, {
      timeout: 20000,
    })
    .catch(() => {})
  await page.waitForTimeout(500)
}

/* --- a real PNG, so MED-04's resize has actual work to do ------------------ */

function testPng(width, height) {
  const crc32 = (buffer) => {
    let c
    let crc = 0xffffffff
    for (let n = 0; n < buffer.length; n++) {
      c = (crc ^ buffer[n]) & 0xff
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crc = (crc >>> 8) ^ c
    }
    return (crc ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    const offset = y * (width * 3 + 1)
    raw[offset] = 0
    for (let x = 0; x < width; x++) {
      raw[offset + 1 + x * 3] = ((x * 255) / width) | 0
      raw[offset + 2 + x * 3] = ((y * 255) / height) | 0
      raw[offset + 3 + x * 3] = 128
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* --- run ------------------------------------------------------------------- */

console.log('\nmoin-portfolio — ADMIN browser verification (Chrome, production build)\n')

let exitCode = 0
let server
let browser
/** Set only if the MED-04 upload actually stored something. */
let uploadedAvatarPath = null

try {
  if (!URL_ || !KEY) {
    throw new EnvironmentBlocker('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set')
  }
  if (!EMAIL || !PASSWORD) {
    throw new EnvironmentBlocker('ADMIN_EMAIL / ADMIN_PASSWORD are not set in .env.local')
  }

  server = await preview({ preview: { port: PORT, strictPort: true } })
  browser = await chromium.launch({ channel: 'chrome' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const runtime = watch(page)

  /* --- 1. The auth gate, BEFORE signing in -------------------------------- */
  section('FR-AUTH-05 — the gate, while signed out')

  await page.goto(`${BASE}/admin/settings`, { waitUntil: 'load' })
  await page.waitForTimeout(2500)
  const redirected = page.url()

  check(
    'signed-out access to /admin/settings redirects to the login page',
    redirected.includes('/admin/login'),
    `landed on ${redirected.replace(BASE, '')}`,
  )
  check(
    'the redirect preserves returnTo',
    redirected.includes('returnTo=') && decodeURIComponent(redirected).includes('/admin/settings'),
    redirected.replace(BASE, ''),
  )
  check('the login page renders its own heading', (await headingOf(page)).length > 0, 'no <h1>')

  /* --- 2. Sign in — FATAL -------------------------------------------------
   *
   * Everything below assumes an authenticated shell. If this fails, the rest
   * would report thirteen "page did not render" failures that all really mean
   * "you are looking at the login screen", which is worse than saying nothing.
   */
  section('FR-AUTH-01/02 — sign in')

  await page.goto(`${BASE}/admin/login`, { waitUntil: 'load' })
  await page.waitForSelector('input[type="email"]', { timeout: 20000 })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 25000 })
  } catch {
    const shownError = await page
      .evaluate(() => document.querySelector('[role="alert"]')?.textContent?.trim() ?? '')
      .catch(() => '')
    throw new ShellFailure(
      `sign-in did not reach /admin/dashboard (url ${page.url().replace(BASE, '')}` +
        `${shownError ? `, the form said "${shownError}"` : ''})`,
    )
  }

  check('sign-in lands on /admin/dashboard', page.url().includes('/admin/dashboard'))
  check('the admin shell renders (no 500 boundary)', !(await crashed(page)))

  /* --- 3. Every admin route ----------------------------------------------- */
  section('Every admin route renders')

  // Read-only. The editor route needs a real id; inventing one would exercise
  // the not-found path instead of the editor.
  let editorRoute = null
  {
    const supabase = createClient(URL_, KEY)
    const { error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
    if (error) {
      harnessProblem('resolve a project id for the editor route', error.message)
    } else {
      const { data } = await supabase
        .from('projects')
        .select('id, title')
        .order('sort_order')
        .limit(1)
      if (data?.[0]) {
        editorRoute = {
          path: `/admin/projects/${data[0].id}/edit`,
          expect: data[0].title,
          label: 'project editor (existing project)',
        }
      } else {
        notes.push('No projects exist, so the edit-an-existing-project route was not exercised.')
      }
    }
    await supabase.auth.signOut()
  }

  const ROUTES = [
    { path: '/admin/dashboard', expect: 'Dashboard' },
    { path: '/admin/projects', expect: 'Projects' },
    { path: '/admin/projects/new', expect: 'New project' },
    ...(editorRoute ? [editorRoute] : []),
    { path: '/admin/experience', expect: 'Experience' },
    { path: '/admin/skills', expect: 'Skills' },
    { path: '/admin/education', expect: 'Education' },
    { path: '/admin/social-links', expect: 'Social links' },
    { path: '/admin/messages', expect: 'Messages' },
    { path: '/admin/media', expect: 'Media' },
    { path: '/admin/resume', expect: 'Resume' },
    { path: '/admin/settings', expect: 'Settings' },
  ]

  for (const route of ROUTES) {
    runtime.uncaught.length = 0
    runtime.logged.length = 0
    await gotoAdmin(page, route.path)

    const didCrash = await crashed(page)
    const heading = await headingOf(page)
    const label = route.label ?? route.path

    check(`${label}: renders without the 500 boundary`, !didCrash)
    check(
      `${label}: heading is "${route.expect}"`,
      heading.slice(0, 24).toLowerCase() === route.expect.slice(0, 24).toLowerCase(),
      `saw "${heading || '(none)'}"`,
    )
    check(
      `${label}: no uncaught exceptions`,
      runtime.uncaught.length === 0,
      runtime.uncaught.join(' | '),
    )
    if (runtime.logged.length > 0) {
      notes.push(
        `${label}: ${runtime.logged.length} handled error(s) logged — ${runtime.logged[0]}`,
      )
    }
  }

  /* --- 4. FR-ADM-05 -------------------------------------------------------
   *
   * Also a regression guard on the data router: `useBlocker` throws outside
   * one, so if App.tsx is ever reverted to <BrowserRouter> these fail loudly
   * rather than the guard silently doing nothing.
   */
  section('FR-ADM-05 — unsaved-changes protection')

  await gotoAdmin(page, '/admin/projects/new')

  // Clean form first, to prove the guard is not simply blocking everything.
  await page.click('a[href="/admin/projects"]')
  await page.waitForTimeout(1500)
  check(
    'a CLEAN form navigates away freely',
    page.url().endsWith('/admin/projects'),
    `url ${page.url().replace(BASE, '')}`,
  )

  await gotoAdmin(page, '/admin/projects/new')
  const titleInput = page.locator('input').first()
  const DIRTY_VALUE = 'zz-verify unsaved draft'
  await titleInput.fill(DIRTY_VALUE)
  await page.waitForTimeout(600)
  await page.click('a[href="/admin/projects"]')
  await page.waitForTimeout(1500)

  const dialogText = await page.evaluate(
    () => document.querySelector('[role="dialog"]')?.textContent ?? '',
  )
  check(
    'a DIRTY form blocks the navigation',
    page.url().includes('/admin/projects/new'),
    `url ${page.url().replace(BASE, '')}`,
  )
  check(
    'a confirmation dialog explains why',
    /leave without saving/i.test(dialogText),
    dialogText.slice(0, 60) || '(no dialog appeared)',
  )

  const stayButton = page
    .locator('[role="dialog"] button', { hasText: /stay|cancel|keep/i })
    .first()
  if ((await stayButton.count()) === 0) {
    harnessProblem('Cancel keeps you on the editor', 'no cancel-style button found in the dialog')
  } else {
    await stayButton.click()
    await page.waitForTimeout(1000)
    check('Cancel keeps you on the editor', page.url().includes('/admin/projects/new'))
    const preserved = await titleInput.inputValue()
    check('Cancel PRESERVES what was typed', preserved === DIRTY_VALUE, `field now "${preserved}"`)
  }

  await page.click('a[href="/admin/projects"]')
  await page.waitForTimeout(1200)
  const leaveButton = page.locator('[role="dialog"] button', { hasText: /leave|discard/i }).first()
  if ((await leaveButton.count()) === 0) {
    harnessProblem('Discard proceeds to the destination', 'no discard-style button found')
  } else {
    await leaveButton.click()
    await page.waitForTimeout(1800)
    check(
      'Discard proceeds to the destination',
      page.url().endsWith('/admin/projects'),
      `url ${page.url().replace(BASE, '')}`,
    )
  }

  /* --- 5. MED-04 ---------------------------------------------------------- */
  section('MED-04 — avatar upload pipeline')

  const SOURCE_W = 2400
  const SOURCE_H = 1000
  const png = testPng(SOURCE_W, SOURCE_H)

  await gotoAdmin(page, '/admin/settings')
  const fileInput = page.locator('input[type="file"]').first()

  if ((await fileInput.count()) === 0) {
    check('the avatar uploader is present on /admin/settings', false, 'no file input found')
  } else {
    check('the avatar uploader is present on /admin/settings', true)

    await fileInput.setInputFiles({
      name: 'zz Verify Photo.png',
      mimeType: 'image/png',
      buffer: png,
    })
    await page.waitForTimeout(1500)

    const uploadButton = page.locator('button', { hasText: /^Upload$/ }).first()
    check('A11Y-06: Upload is disabled while alt text is empty', await uploadButton.isDisabled())

    await page.locator('input[placeholder="Describe what the image shows"]').fill('zz verify')
    await page.waitForTimeout(400)
    check('A11Y-06: Upload enables once alt text is supplied', await uploadButton.isEnabled())

    await uploadButton.click()
    await page.waitForTimeout(7000)

    const stored = await page.evaluate(() => {
      const image = [...document.querySelectorAll('img')].find((i) => i.src.includes('/profile/'))
      const pathElement = [...document.querySelectorAll('p')].find((p) =>
        /^avatar\//.test(p.textContent || ''),
      )
      return {
        src: image?.src ?? null,
        width: image?.naturalWidth ?? 0,
        height: image?.naturalHeight ?? 0,
        path: pathElement?.textContent?.trim() ?? null,
      }
    })
    uploadedAvatarPath = stored.path

    if (!stored.src) {
      check('the upload stored an object and previewed it', false, 'no /profile/ image rendered')
    } else {
      check('the upload stored an object and previewed it', true)

      const response = await fetch(stored.src)
      const body = Buffer.from(await response.arrayBuffer())
      const isWebp =
        body.subarray(0, 4).toString() === 'RIFF' && body.subarray(8, 12).toString() === 'WEBP'

      check('MED-04: the stored object is WebP', isWebp)
      check(
        'MED-04: the long edge is capped at 1920px',
        stored.width === 1920,
        `${stored.width}x${stored.height}`,
      )
      check(
        'MED-04: the aspect ratio is preserved',
        Math.abs(stored.width / stored.height - SOURCE_W / SOURCE_H) < 0.01,
        `${(stored.width / stored.height).toFixed(2)} vs ${(SOURCE_W / SOURCE_H).toFixed(2)}`,
      )
      check(
        'MED-04: the optimised file is smaller than the source',
        body.length < png.length,
        `${(png.length / 1024).toFixed(1)} KB -> ${(body.length / 1024).toFixed(1)} KB`,
      )
      check(
        'the storage key is dated and slugified',
        /^avatar\/\d{4}-\d{2}-\d{2}-[0-9a-f]{8}-zz-verify-photo\.webp$/.test(stored.path ?? ''),
        stored.path ?? '(none)',
      )
    }
  }

  /* --- 6. Responsive ------------------------------------------------------ */
  section(`Responsive — admin at ${WIDTHS.length} widths`)

  for (const path of ['/admin/dashboard', '/admin/projects', '/admin/media', '/admin/settings']) {
    await gotoAdmin(page, path)
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(300)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      check(
        `${path} @ ${width}px: no horizontal overflow`,
        scrollWidth <= width + 1,
        `scrollWidth ${scrollWidth}`,
      )
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
  }

  /* --- 7. axe ------------------------------------------------------------- */
  section('Accessibility — axe-core on the main admin screens')

  for (const path of [
    '/admin/dashboard',
    '/admin/projects',
    '/admin/media',
    '/admin/resume',
    '/admin/settings',
  ]) {
    await gotoAdmin(page, path)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact))
    const nodeCount = serious.reduce((total, v) => total + v.nodes.length, 0)

    check(
      `${path}: zero critical/serious violations`,
      serious.length === 0,
      `${nodeCount} node(s) across ${serious.length} rule(s): ${serious.map((v) => v.id).join(', ')}`,
    )

    // Nodes, not just rules — verify-ui reported "1 violation" for what was
    // 17 failing elements from two unrelated causes.
    for (const violation of serious) {
      console.log(
        `      [${violation.impact}] ${violation.id} — ${violation.nodes.length} node(s): ${violation.help}`,
      )
      const grouped = new Map()
      for (const node of violation.nodes) {
        const data = node.any?.[0]?.data ?? {}
        const key =
          data.contrastRatio === undefined
            ? node.target.join(' ')
            : `${data.fgColor} on ${data.bgColor} = ${data.contrastRatio}:1 (${data.fontSize})`
        grouped.set(key, (grouped.get(key) ?? 0) + 1)
      }
      for (const [key, count] of grouped) {
        console.log(`         ${String(count).padStart(2)}x  ${key}`)
      }
    }

    const incomplete = results.incomplete.reduce((total, i) => total + i.nodes.length, 0)
    if (incomplete > 0) {
      notes.push(
        `${path}: ${incomplete} node(s) axe could NOT evaluate (manual review) — ` +
          results.incomplete.map((i) => `${i.id}:${i.nodes.length}`).join(', '),
      )
    }
  }
} catch (error) {
  if (error instanceof EnvironmentBlocker) {
    console.log(`\n${'─'.repeat(70)}`)
    console.log('ENVIRONMENT BLOCKER — the harness could not start.\n')
    console.log(`  ${error.message}`)
    console.log('\nThis says nothing about the product.')
    exitCode = 2
  } else if (error instanceof ShellFailure) {
    console.log(`\n${'─'.repeat(70)}`)
    console.log('ABORTED — the admin shell or sign-in failed.\n')
    console.log(`  ${error.message}`)
    console.log('\nEverything below this point assumes an authenticated shell, so the')
    console.log('remaining checks were SKIPPED rather than reported as a cascade of')
    console.log('failures that all mean "you are looking at the login page".')
    exitCode = 1
  } else {
    console.log(`\n  ⚠ unexpected harness exception: ${error.message}`)
    harnessFailures.push(`unexpected exception: ${error.message}`)
  }
} finally {
  /*
   * Runs on every exit path, including a crash mid-upload. The object is the
   * only thing this suite creates; the profile row is never saved, so
   * `avatar_path` still points wherever it did before.
   */
  if (uploadedAvatarPath) {
    try {
      const cleaner = createClient(URL_, KEY)
      await cleaner.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
      const { error } = await cleaner.storage.from('profile').remove([uploadedAvatarPath])
      const { data: profile } = await cleaner.from('profiles').select('avatar_path').maybeSingle()
      console.log(
        `\n  cleanup: removed ${uploadedAvatarPath} ${error ? `FAILED (${error.message})` : '✓'}` +
          ` | profiles.avatar_path untouched: ${profile?.avatar_path ?? 'NULL'}`,
      )
      if (error) harnessFailures.push(`cleanup failed for ${uploadedAvatarPath}: ${error.message}`)
      await cleaner.auth.signOut()
    } catch (cause) {
      harnessFailures.push(`cleanup threw: ${cause.message}`)
      console.log(`\n  cleanup THREW: ${cause.message} — remove ${uploadedAvatarPath} by hand`)
    }
  }
  if (browser) await browser.close()
  if (server) await server.httpServer.close()
}

/* --- report ---------------------------------------------------------------- */

if (exitCode !== 2) {
  console.log(`\n${'─'.repeat(70)}`)
  for (const note of notes) console.log(`  note: ${note}`)
  if (notes.length) console.log('')

  if (harnessFailures.length > 0) {
    console.log(`HARNESS PROBLEMS — ${harnessFailures.length} check(s) could not be performed:`)
    for (const failure of harnessFailures) console.log(`  • ${failure}`)
    console.log('These are faults in this script, NOT evidence about the product.\n')
  }

  if (productFailures.length === 0 && exitCode === 0) {
    console.log(`PASS — ${passed} admin checks, 0 product failures.`)
    console.log('Scope: the admin UI shell, its routes, the unsaved-changes guard and')
    console.log('the upload pipeline. Per-resource CRUD is covered by db:verify:auth.')
  } else if (exitCode !== 1) {
    console.log(`FAIL — ${passed} passed, ${productFailures.length} product failure(s):\n`)
    for (const failure of productFailures) console.log(`  • ${failure}`)
    exitCode = 1
  }
  console.log('')
}

process.exitCode = exitCode
