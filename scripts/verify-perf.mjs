/**
 * Performance floor — `npm run verify:perf` (replica PRD §12.4).
 *
 * Asserts LCP < 2.5s and CLS < 0.1 on a 4G / mid-tier mobile proxy:
 * CDP-throttled to ~4G (9 Mbps down, 170ms RTT) with 4x CPU slowdown at
 * 390x844, against the production preview build. Run `npm run build` first.
 *
 * The LCP element is the hero portrait. Two things keep it under the floor,
 * both in index.html: the preload that starts the fetch at t≈0, and the boot
 * shell painting the hero statically before hydration. The boot portrait must
 * stay UNMASKED — a CSS mask suppresses its largest-contentful-paint entry
 * and LCP falls back to the hydrated paint at ~2.2s, which leaves no margin.
 *
 * Timing is a race against module evaluation, so a single sample is noisy:
 * ~750ms when the pre-hydration frame lands, ~2.2s when it does not. Both
 * pass; treat a failure as real only if it repeats.
 */
import { chromium } from 'playwright'
import { preview } from 'vite'

const server = await preview({ preview: { port: 4187, strictPort: true } })
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
})
const page = await context.newPage()

const cdp = await context.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 170,
  downloadThroughput: (9 * 1024 * 1024) / 8,
  uploadThroughput: (3 * 1024 * 1024) / 8,
})
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

await page.addInitScript(() => {
  window.__vitals = { lcp: 0, cls: 0 }
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__vitals.lcp = e.startTime
  }).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.hadRecentInput) window.__vitals.cls += e.value
    }
  }).observe({ type: 'layout-shift', buffered: true })
})

await page.goto('http://localhost:4187/', { waitUntil: 'load', timeout: 90000 })
await page.waitForTimeout(6000)

// Scroll the page so late-mounting content (lazy 3D, reveals) contributes
// any layout shift it is going to cause, then settle.
for (let i = 0; i < 30; i++) {
  await page.mouse.wheel(0, 700)
  await page.waitForTimeout(120)
}
await page.waitForTimeout(2000)

const vitals = await page.evaluate(() => window.__vitals)
const lcpOk = vitals.lcp > 0 && vitals.lcp < 2500
const clsOk = vitals.cls < 0.1
console.log(`LCP: ${Math.round(vitals.lcp)}ms (< 2500 required) ${lcpOk ? '✓' : '✗'}`)
console.log(`CLS: ${vitals.cls.toFixed(4)} (< 0.1 required) ${clsOk ? '✓' : '✗'}`)

await browser.close()
await server.close()
console.log(lcpOk && clsOk ? 'PASS' : 'FAIL')
process.exit(lcpOk && clsOk ? 0 : 1)
