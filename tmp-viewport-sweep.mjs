import { chromium } from 'playwright'
import { preview } from 'vite'

const DIR =
  'C:/Users/BOOKEN~1/AppData/Local/Temp/claude/e--Projects-MOINPATEL-IN/e031beab-9857-4ced-9045-ac6029711b23/scratchpad'

const VIEWPORTS = [
  { w: 1440, h: 900, name: 'desktop-l' },
  { w: 1280, h: 800, name: 'desktop-m' },
  { w: 1024, h: 768, name: 'tablet-landscape' },
  { w: 768, h: 1024, name: 'tablet-portrait' },
  { w: 390, h: 844, name: 'mobile-l' },
  { w: 375, h: 812, name: 'mobile-m' },
]

const server = await preview({ preview: { port: 4185, strictPort: true } })
const browser = await chromium.launch()

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
  await page.goto('http://localhost:4185/', { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)

  // Scroll the full page in steps so lazy/reveal content mounts, checking
  // overflow at every stop — overflow can appear mid-page only.
  const report = await page.evaluate(async () => {
    const stops = []
    const doc = document.documentElement
    const step = Math.floor(innerHeight * 0.8)
    for (let y = 0; y <= doc.scrollHeight; y += step) {
      scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
      if (doc.scrollWidth > innerWidth + 1) {
        stops.push({ y, scrollWidth: doc.scrollWidth, innerWidth })
      }
    }
    // find offending elements if any overflow was seen
    let offenders = []
    if (stops.length) {
      offenders = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.right > innerWidth + 1 || r.left < -1
        })
        .slice(0, 8)
        .map((el) => ({
          tag: el.tagName,
          cls: String(el.className).slice(0, 60),
          right: Math.round(el.getBoundingClientRect().right),
        }))
    }
    return { scrollHeight: doc.scrollHeight, overflowStops: stops.slice(0, 5), offenders }
  })
  console.log(vp.name, JSON.stringify(report))

  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${DIR}/vp-${vp.name}.png`, fullPage: true })
  await page.close()
}

await browser.close()
await server.close()
console.log('done')
