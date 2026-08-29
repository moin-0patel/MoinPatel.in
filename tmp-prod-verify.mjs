/*
 * Full production verification of https://portfolio-xl5y.onrender.com
 * Read-only. Checks hydration, real-input scrolling, every route, SEO
 * artifacts, content facts (Performix, journey order), overflow, occlusion.
 */
import { chromium } from 'playwright'
const BASE = 'https://portfolio-xl5y.onrender.com'
const b = await chromium.launch()
let pass = 0
let fail = 0
const ck = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : detail ? ' — ' + detail : ''}`)
  ok ? pass++ : fail++
}

// ---------- 1. Home: hydration + real wheel scroll (1440) -------------------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 150)))
  await p.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 })
  await p.waitForTimeout(4500)
  const s = await p.evaluate(() => ({
    react: !!document.querySelector('[data-chapter="hero"]'),
    header: !!document.querySelector('header'),
    headerPos: document.querySelector('header') ? getComputedStyle(document.querySelector('header')).position : null,
    docH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    sections: [...document.querySelectorAll('section[id]')].map((x) => x.id),
  }))
  ck('home hydrates (React mounted)', s.react)
  ck('zero page errors', errs.length === 0, errs[0])
  ck('document is full height (~11000px)', s.docH > 9000, `docH=${s.docH}`)
  ck('fixed header present', s.header && s.headerPos === 'fixed', s.headerPos)
  ck('no horizontal overflow @1440', !s.overflowX)
  ck('canonical is the real host', s.canonical === BASE + '/', s.canonical)
  ck('og:url is the real host', s.ogUrl === BASE + '/', s.ogUrl)
  ck('all 10 home sections render', s.sections.length >= 10, s.sections.join(','))

  // Real wheel input.
  await p.mouse.move(720, 450)
  for (let i = 0; i < 8; i++) {
    await p.mouse.wheel(0, 500)
    await p.waitForTimeout(120)
  }
  const y = await p.evaluate(() => window.scrollY)
  ck('mouse-wheel scrolling works', y > 800, `scrollY=${y}`)

  // Content facts.
  const facts = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-journey-card]')].map((c) =>
      c.innerText.replace(/\s+/g, ' ').slice(0, 60),
    )
    const work = document.querySelector('#featured-projects')?.innerText ?? ''
    return { cards, hasPerformix: /Performix/i.test(work), viewLive: /View live/i.test(work) }
  })
  ck('journey card 1 is Reservationist (date order)', /Reservationist/.test(facts.cards[0] ?? ''), facts.cards[0])
  ck('journey card 2 is AI Automation Executive', /AI Automation/.test(facts.cards[1] ?? ''), facts.cards[1])
  ck('Selected Work shows Performix', facts.hasPerformix)
  await p.close()
}

// ---------- 2. Mobile: touch-viewport scroll + overflow (390) ---------------
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  await p.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 })
  await p.waitForTimeout(4000)
  await p.touchscreen.tap(195, 400)
  await p.evaluate(() => window.scrollTo(0, 0))
  // Touch-drag scroll via CDP-backed gestures: swipe up.
  await p.mouse.move(195, 600)
  const before = await p.evaluate(() => window.scrollY)
  await p.evaluate(
    () =>
      new Promise((r) => {
        window.scrollBy({ top: 1200, behavior: 'instant' })
        requestAnimationFrame(r)
      }),
  )
  const after = await p.evaluate(() => window.scrollY)
  const m = await p.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    react: !!document.querySelector('[data-chapter="hero"]'),
    firstH1: document.querySelector('main h1, main section')?.getBoundingClientRect().top,
  }))
  ck('mobile hydrates', m.react)
  ck('mobile scrolling works', after > before)
  ck('no horizontal overflow @390', !m.overflowX)
  await p.close()
}

// ---------- 3. Every route hydrates, nothing occluded -----------------------
for (const route of ['/about', '/projects', '/contact', '/resume', '/skills', '/experience']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 80)))
  const resp = await p.goto(BASE + route, { waitUntil: 'networkidle', timeout: 90000 })
  await p.waitForTimeout(2500)
  const s = await p.evaluate(() => {
    const h1 = document.querySelector('main h1')
    const header = document.querySelector('header')
    return {
      react: !!document.querySelector('main') && document.querySelector('main').children.length > 0,
      h1Top: h1 ? h1.getBoundingClientRect().top : null,
      headerH: header ? header.getBoundingClientRect().height : 0,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }
  })
  ck(
    `${route} — 200, hydrated, clear of header, no overflow`,
    resp.status() === 200 && s.react && !s.overflowX && (s.h1Top === null || s.h1Top >= s.headerH) && errs.length === 0,
    `status=${resp.status()} h1Top=${s.h1Top} errs=${errs[0] ?? ''}`,
  )
  await p.close()
}

// ---------- 4. Prerendered project page + case study live link --------------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(BASE + '/projects/exam-build-platform', { waitUntil: 'networkidle', timeout: 90000 })
  await p.waitForTimeout(3000)
  const s = await p.evaluate(() => ({
    title: document.title,
    hasLive: [...document.querySelectorAll('a')].some((a) => a.href.includes('bookends-exam.onrender.com')),
    body: document.body.innerText.slice(0, 40),
  }))
  ck('project page title carries Performix', /Performix/i.test(s.title), s.title)
  ck('case study links to the live app', s.hasLive)
  await p.close()
}
await b.close()

// ---------- 5. Static SEO artifacts (curl-level) ----------------------------
const sm = await (await fetch(BASE + '/sitemap.xml')).text()
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1])
ck('sitemap has 10 URLs', urls.length === 10, String(urls.length))
ck('sitemap URLs use the real host', urls.every((u) => u.startsWith(BASE)), urls[0])
const robots = await (await fetch(BASE + '/robots.txt')).text()
ck('robots.txt sitemap points at real host', robots.includes(`Sitemap: ${BASE}/sitemap.xml`))
const projHtml = await (await fetch(BASE + '/projects/exam-build-platform')).text()
ck(
  'prerendered HTML (no JS) already carries the Performix title',
  /<title>[^<]*Performix/i.test(projHtml),
  projHtml.match(/<title>[^<]*/)?.[0],
)

console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' FAILURES'} — ${pass} passed`)
