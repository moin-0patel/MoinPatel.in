import { chromium } from 'playwright'
import { preview } from 'vite'

const DIR =
  'C:/Users/BOOKEN~1/AppData/Local/Temp/claude/e--Projects-MOINPATEL-IN/e031beab-9857-4ced-9045-ac6029711b23/scratchpad'

const server = await preview({ preview: { port: 4185, strictPort: true } })
const browser = await chromium.launch()

for (const vp of [
  { w: 768, h: 1024, name: 'tablet-portrait' },
  { w: 390, h: 844, name: 'mobile-l' },
]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
  await page.goto('http://localhost:4185/', { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)

  // Wheel-scroll like a person so scroll-linked reveals actually run.
  const target = await page.evaluate(() => {
    const el = document.querySelector('#experience')
    return el ? el.getBoundingClientRect().top + scrollY : null
  })
  console.log(vp.name, 'journey top:', target)
  if (target) {
    let guard = 0
    while (guard++ < 400) {
      const y = await page.evaluate(() => scrollY)
      if (y >= target - 200) break
      await page.mouse.wheel(0, 400)
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${DIR}/journey-${vp.name}-1.png` })
    // one viewport further into the section
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 400)
      await page.waitForTimeout(120)
    }
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${DIR}/journey-${vp.name}-2.png` })
  }
  await page.close()
}

await browser.close()
await server.close()
console.log('done')
