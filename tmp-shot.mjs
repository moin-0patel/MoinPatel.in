import { chromium } from 'playwright'
import { preview } from 'vite'
const OUT = 'C:/Users/BOOKEN~1/AppData/Local/Temp/claude/e--Projects-MOINPATEL-IN/feaf6372-70fc-4415-9a67-4e402cd32018/scratchpad'
const tag = process.env.TAG ?? 'before'
const PORT = Number(process.env.PORT ?? 4300)
const server = await preview({ preview: { port: PORT, strictPort: true } })
const browser = await chromium.launch({ channel: 'chrome' })
for (const vp of [{ width: 1280, height: 900, n: 'desktop' }, { width: 390, height: 844, n: 'mobile' }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'load' })
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${OUT}/b1-${tag}-${vp.n}.png` })
  const f = await page.evaluate(() => {
    const el = document.querySelector('p.font-display') ?? document.querySelector('h1')
    const cs = getComputedStyle(el)
    return { family: cs.fontFamily.split(',')[0], size: cs.fontSize, loaded: [...document.fonts].map(f=>f.family+' '+f.status).join(', ') || 'none' }
  })
  console.log(`${tag} ${vp.n}: display face = ${f.family}, size ${f.size}`)
  console.log(`   document.fonts: ${f.loaded}`)
  await page.close()
}
await browser.close()
await new Promise(r=>server.httpServer.close(r))
