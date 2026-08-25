/**
 * Portrait cut-out — `npm run assets:portrait`
 *
 * Turns `scripts/portrait-source.jpeg` into `public/moin-portrait.webp`, a real
 * RGBA cut-out. Run by hand when the source photograph changes; the output is
 * committed, so `npm run build` never needs a browser.
 *
 * WHY THIS EXISTS AT ALL
 *
 * The hero sets the figure directly on the cream ground with nothing behind it,
 * which needs an alpha channel the supplied asset does not have. The escalation
 * in the brief was followed in order and the first three rungs were ruled out
 * by measurement, not by preference:
 *
 *   1. A genuine transparent asset. There is none. The photograph handed over
 *      in `assets/` and the copy the site was serving are byte-identical
 *      (md5 6f09e402…) — one source, JPEG, so no alpha is possible.
 *
 *   2. `mix-blend-mode: multiply`, which is what the hero shipped with. It
 *      does clear the background — measured 1-3/255 between the pixels inside
 *      and outside the image box at 390px — but it pays for that by
 *      multiplying the SUBJECT by the ground too, so the photograph rendered
 *      as a darkened duotone rather than as itself.
 *
 *   3. CSS masking alone. A mask needs to know where the subject is; deriving
 *      that per-frame in CSS is not something CSS can do.
 *
 * So: rung 4, image processing — with no new dependency. The decode and the
 * encode both run in the Chromium that `playwright` already installs for
 * `verify:ui`, through `<canvas>`. Nothing was added to package.json.
 *
 * WHAT THE SOURCE ACTUALLY IS (measured, not assumed)
 *
 *   1086 x 1448, progressive JPEG, 3 components — no alpha channel.
 *
 *   The background is a BAKED-IN transparency checkerboard: 16px squares
 *   alternating between ~241 and ~254, every pixel exactly neutral (measured
 *   max saturation across the top 100 rows: 0). Someone removed the background
 *   in a tool and exported the preview instead of the PNG.
 *
 *   That makes the separation unusually clean. Luminance histogram: the
 *   subject tails off through the 230s in the low hundreds of pixels per
 *   bucket, then 240 jumps to 14151 and 241 to 52604. A cut at 234 sits inside
 *   a real gap rather than in the middle of a distribution.
 *
 *   Edges are sharp — a shoulder goes 236 -> 115 -> 28 across two pixels — so
 *   the matte below is a two-pixel band, not a blur.
 *
 *   The figure reaches the left frame edge at y=1093 (75.5%) and the right at
 *   y=1048 (72.4%): the bottom quarter of the photograph is a full-width block
 *   of clipped torso with two dead-straight vertical sides. No cut-out can fix
 *   that — the arms genuinely leave the frame — and it is why the
 *   `portrait-matte` utility in globals.css exists on top of this file.
 *
 * HOW THE ALPHA IS DERIVED
 *
 * FLOOD FILL FROM THE BORDER, not a global threshold. A threshold applied
 * everywhere punches holes wherever the subject is bright — teeth, the catch
 * light in an eye — and those holes are invisible in review until they are
 * shipped. Background is defined as "light, neutral, and reachable from the
 * frame edge without crossing the subject", which is a statement about the
 * photograph rather than about a number.
 *
 * KNOWN-BACKGROUND MATTING on the boundary ring. A flattened cut-out has
 * partially-covered pixels along every edge: a hair strand covering 40% of a
 * pixel left 60% of the light grey behind mixed into it. Hard alpha keeps that
 * grey, and grey is much lighter than the cream ground, so hair would carry a
 * pale halo. Since the composite is C = a*F + (1-a)*B and B is known — it is
 * the local background, ~248 and neutral — a is recoverable from luminance and
 * F from un-premultiplying. That removes the halo instead of hiding it.
 *
 * The result is Moin's photograph with its background gone. No recolouring, no
 * posterising, no relighting: every fully-opaque pixel is byte-identical to the
 * JPEG it came from, and only the two-pixel edge band is touched.
 *
 * The bright rim along the top of the hair is left exactly as shot. It is a
 * specular highlight in the photograph — it is plainly there in the source,
 * against the source's own checkerboard — not a matte artefact. It reads as
 * hair sheen against the cream, and removing it would be retouching Moin.
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { chromium } from 'playwright'

const SOURCE = path.resolve('scripts/portrait-source.jpeg')
const OUTPUT = path.resolve('public/moin-portrait.webp')

/**
 * Quality for the WebP encode.
 *
 * 0.9 keeps the file at roughly the JPEG it replaces while carrying an alpha
 * channel the JPEG could not. The hero is the LCP element, so this number is a
 * page-weight decision, not a taste one.
 */
const WEBP_QUALITY = 0.9

console.log('\nportrait cut-out\n')

const source = await readFile(SOURCE)
console.log(
  `  source  ${path.relative(process.cwd(), SOURCE)} — ${Math.round(source.length / 1024)} KB`,
)

const browser = await chromium.launch()
try {
  const page = await browser.newPage()

  const result = await page.evaluate(
    async ({ dataUrl, quality }) => {
      const image = new Image()
      image.src = dataUrl
      await image.decode()

      const width = image.naturalWidth
      const height = image.naturalHeight

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(image, 0, 0)

      const image_ = ctx.getImageData(0, 0, width, height)
      const data = image_.data

      const luminance = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      const saturation = (i) =>
        Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2])

      /*
       * The background test. Both halves are load-bearing:
       *
       *   luminance >= 234 — the gap measured in the histogram between the
       *   subject's tail and the checkerboard's floor;
       *
       *   saturation <= 6 — the checkerboard is exactly neutral, so anything
       *   carrying colour is the photograph. This is what protects a blown
       *   highlight on skin, which is bright but never grey.
       */
      const BG_LUMINANCE = 234
      const BG_SATURATION = 6
      const looksLikeBackground = (i) =>
        luminance(i) >= BG_LUMINANCE && saturation(i) <= BG_SATURATION

      /* --- 1. flood fill the background in from the frame edge ------------- */

      const outside = new Uint8Array(width * height)
      const stack = new Int32Array(width * height)
      let top = 0

      const push = (p) => {
        if (outside[p]) return
        if (!looksLikeBackground(p * 4)) return
        outside[p] = 1
        stack[top++] = p
      }

      for (let x = 0; x < width; x++) {
        push(x)
        push((height - 1) * width + x)
      }
      for (let y = 0; y < height; y++) {
        push(y * width)
        push(y * width + width - 1)
      }

      while (top > 0) {
        const p = stack[--top]
        const x = p % width
        const y = (p - x) / width
        if (x > 0) push(p - 1)
        if (x < width - 1) push(p + 1)
        if (y > 0) push(p - width)
        if (y < height - 1) push(p + width)
      }

      /* --- 2. drop specks the fill could not reach ------------------------- */

      /*
       * JPEG ringing around the high-contrast silhouette overshoots in both
       * directions. The bright overshoot is swallowed by the fill; the dark
       * one survives as a handful of stray pixels floating in what should be
       * empty ground. Everything not connected to the largest opaque component
       * is background the fill was walled off from.
       */
      const label = new Int32Array(width * height).fill(-1)
      let largest = -1
      let largestSize = 0
      let next = 0
      const sizes = []

      for (let p = 0; p < width * height; p++) {
        if (outside[p] || label[p] !== -1) continue
        const id = next++
        let size = 0
        top = 0
        stack[top++] = p
        label[p] = id
        while (top > 0) {
          const q = stack[--top]
          size++
          const x = q % width
          const y = (q - x) / width
          const neighbours = [
            x > 0 ? q - 1 : -1,
            x < width - 1 ? q + 1 : -1,
            y > 0 ? q - width : -1,
            y < height - 1 ? q + width : -1,
          ]
          for (const n of neighbours) {
            if (n < 0 || outside[n] || label[n] !== -1) continue
            label[n] = id
            stack[top++] = n
          }
        }
        sizes.push(size)
        if (size > largestSize) {
          largestSize = size
          largest = id
        }
      }

      let specks = 0
      for (let p = 0; p < width * height; p++) {
        if (!outside[p] && label[p] !== largest) {
          outside[p] = 1
          specks++
        }
      }

      /* --- 3. matte the boundary ring -------------------------------------- */

      const alpha = new Float32Array(width * height)
      for (let p = 0; p < width * height; p++) alpha[p] = outside[p] ? 0 : 1

      const touches = (p, want, radius) => {
        const x = p % width
        const y = (p - x) / width
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (!dx && !dy) continue
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            if (outside[ny * width + nx] === want) return true
          }
        }
        return false
      }

      /*
       * TWO PIXELS EACH SIDE OF THE SILHOUETTE, not one.
       *
       * A one-pixel ring is what a hard edge needs — a shoulder goes 236 -> 115
       * -> 28 and is finished. Hair is not that. A transect through the left
       * hair edge at y=480 reads 249, 186, 175, 205, 249, 247, 243, 212, 122:
       * strands and the gaps between them, alternating over ten pixels, with
       * every value in between. A one-pixel ring corrects the outermost of
       * those and leaves the pixels behind them holding light grey, which is
       * lighter than the cream ground and therefore reads as a white fringe
       * around the head. The first run of this script produced exactly that.
       *
       * Two pixels covers the strand structure. It costs nothing on hard edges
       * because the ramp below returns a=1 for them on its own — a shirt pixel
       * two in from the boundary is as dark as its own reference, so the
       * formula resolves to fully opaque rather than to a guess.
       */
      const BAND = 2
      const inBand = new Uint8Array(width * height)
      const ring = []
      for (let p = 0; p < width * height; p++) {
        // Outside the figure only one pixel deep: those are partially covered.
        // Anything further out is ground and must stay completely clear.
        if (outside[p] ? touches(p, 0, 1) : touches(p, 1, BAND)) {
          inBand[p] = 1
          ring.push(p)
        }
      }

      /** Mean background luminance around a pixel — the B in C = a*F + (1-a)*B. */
      const localBackground = (p) => {
        const x = p % width
        const y = (p - x) / width
        let sum = 0
        let n = 0
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            const q = ny * width + nx
            if (!outside[q]) continue
            sum += luminance(q * 4)
            n++
          }
        }
        return n ? sum / n : 248
      }

      /**
       * The F in C = a*F + (1-a)*B — what the photograph would be here if
       * nothing of the ground showed through.
       *
       * DARKEST RATHER THAN MEAN, and that choice is the fringe fix.
       *
       * Averaging the neighbourhood mixes half-covered pixels back into the
       * reference, which drags F up toward the background and hands every
       * strand an alpha near 1 — the fringe survives, just measured more
       * politely. The darkest few pixels nearby are the ones the ground is
       * demonstrably NOT leaking into, so they are what a covered pixel would
       * have looked like.
       *
       * Three darkest rather than one, because JPEG undershoot puts a lone
       * too-dark pixel next to every high-contrast edge and a strict minimum
       * would latch onto it.
       */
      const localForeground = (p) => {
        const x = p % width
        const y = (p - x) / width
        const found = []
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            const q = ny * width + nx
            if (outside[q] || inBand[q]) continue
            found.push(luminance(q * 4))
          }
        }
        if (found.length === 0) return 0 // an isolated strand: assume it is hair
        found.sort((a, b) => a - b)
        const take = Math.min(3, found.length)
        let sum = 0
        for (let k = 0; k < take; k++) sum += found[k]
        return sum / take
      }

      /*
       * Computed against a snapshot, then written back.
       *
       * Un-premultiplying in place would feed each already-corrected pixel to
       * its neighbour as if it were still a composite, and the correction would
       * compound along the edge.
       */
      const corrections = []
      for (const p of ring) {
        const background = localBackground(p)
        const foreground = localForeground(p)

        /*
         * Nothing to solve when the subject is nearly as bright as the ground
         * behind it: a is numerically unstable, and there is no fringe to
         * remove because the two colours already match. Leave the pixel exactly
         * as photographed.
         */
        if (background - foreground < 20) continue

        const i = p * 4
        const a = Math.min(1, Math.max(0, (background - luminance(i)) / (background - foreground)))
        if (a >= 1) continue

        /*
         * Below this coverage the divisor is small enough that un-premultiplying
         * amplifies JPEG noise into confetti. The pixel is 12% visible at most,
         * so its colour cannot matter; its alpha still does, and that is kept.
         */
        const rgb =
          a < 0.12
            ? null
            : [0, 1, 2].map((c) =>
                Math.min(255, Math.max(0, Math.round((data[i + c] - (1 - a) * background) / a))),
              )
        corrections.push({ p, a, rgb })
      }

      for (const { p, a, rgb } of corrections) {
        alpha[p] = a
        if (!rgb) continue
        const i = p * 4
        data[i] = rgb[0]
        data[i + 1] = rgb[1]
        data[i + 2] = rgb[2]
      }

      /* --- 4. write the alpha channel and encode --------------------------- */

      let opaque = 0
      let partial = 0
      for (let p = 0; p < width * height; p++) {
        const a = alpha[p]
        data[p * 4 + 3] = Math.round(a * 255)
        if (a === 1) opaque++
        else if (a > 0) partial++
      }

      ctx.putImageData(image_, 0, 0)

      const encoded = canvas.toDataURL('image/webp', quality)
      if (!encoded.startsWith('data:image/webp')) {
        throw new Error(`canvas refused to encode WebP (got ${encoded.slice(0, 30)})`)
      }

      return {
        width,
        height,
        encoded: encoded.split(',')[1],
        stats: {
          components: sizes.length,
          specks,
          ring: ring.length,
          matted: corrections.length,
          opaquePct: ((opaque / (width * height)) * 100).toFixed(1),
          partial,
          transparentPct: (((width * height - opaque - partial) / (width * height)) * 100).toFixed(
            1,
          ),
        },
      }
    },
    { dataUrl: `data:image/jpeg;base64,${source.toString('base64')}`, quality: WEBP_QUALITY },
  )

  const output = Buffer.from(result.encoded, 'base64')
  await writeFile(OUTPUT, output)

  const s = result.stats
  console.log(`  size    ${result.width} x ${result.height}`)
  console.log(
    `  matte   ${s.opaquePct}% opaque · ${s.partial} partial · ${s.transparentPct}% clear`,
  )
  console.log(`  edges   ${s.ring} ring px, ${s.matted} matted · ${s.specks} speck px removed`)
  console.log(
    `  output  ${path.relative(process.cwd(), OUTPUT)} — ${Math.round(output.length / 1024)} KB\n`,
  )

  if (Number(s.transparentPct) < 20) {
    throw new Error(
      `only ${s.transparentPct}% of the image came out transparent — the background was not found`,
    )
  }
} finally {
  await browser.close()
}
