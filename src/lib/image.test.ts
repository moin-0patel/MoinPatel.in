import { describe, expect, it } from 'vitest'

import {
  MAX_EDGE,
  MAX_UPLOAD_BYTES,
  fitWithin,
  formatBytes,
  toWebpFileName,
  validateImageFile,
} from './image'

/**
 * The pure half of the MED-04 pipeline. `processImage` itself needs a real
 * canvas and `createImageBitmap`, so it is exercised in the browser harness
 * (`verify:ui`) rather than mocked into meaninglessness here.
 */

/** `size` is redefined because constructing a real multi-MB File per case is
 *  pointless when only the reported size is under test. */
const fileOf = (name: string, type: string, size: number): File =>
  Object.defineProperty(new File([], name, { type }), 'size', { value: size })

describe('fitWithin', () => {
  it('leaves an image smaller than the cap untouched', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('never enlarges a small image', () => {
    expect(fitWithin(100, 50)).toEqual({ width: 100, height: 50 })
  })

  it('scales the long edge down to the cap, landscape', () => {
    expect(fitWithin(4000, 2000)).toEqual({ width: MAX_EDGE, height: MAX_EDGE / 2 })
  })

  it('scales on HEIGHT when the image is portrait', () => {
    // The bug this guards: capping width only, which leaves a 3000px-tall
    // portrait photo at full height and defeats the point of the resize.
    expect(fitWithin(2000, 4000)).toEqual({ width: MAX_EDGE / 2, height: MAX_EDGE })
  })

  it('preserves the aspect ratio of a 16:9 cover to the pixel', () => {
    const { width, height } = fitWithin(3840, 2160)
    expect(width / height).toBeCloseTo(16 / 9, 5)
  })

  it('honours an explicit smaller cap', () => {
    expect(fitWithin(1000, 500, 400)).toEqual({ width: 400, height: 200 })
  })

  it('handles an exactly-at-the-cap image without rescaling', () => {
    expect(fitWithin(MAX_EDGE, 1000)).toEqual({ width: MAX_EDGE, height: 1000 })
  })
})

describe('toWebpFileName', () => {
  it('swaps the extension', () => {
    expect(toWebpFileName('cover.jpg')).toBe('cover.webp')
  })

  it('lowercases and slugifies, so storage keys stay URL-safe', () => {
    expect(toWebpFileName('Screenshot 2026-01-04 at 12.30.PNG')).toBe(
      'screenshot-2026-01-04-at-12-30.webp',
    )
  })

  it('strips accents rather than percent-encoding them into the key', () => {
    expect(toWebpFileName('café façade.jpeg')).toBe('cafe-facade.webp')
  })

  it('falls back rather than producing a bare extension', () => {
    expect(toWebpFileName('!!!.png')).toBe('image.webp')
    expect(toWebpFileName('')).toBe('image.webp')
  })

  it('caps runaway names', () => {
    expect(toWebpFileName(`${'a'.repeat(200)}.png`).length).toBeLessThanOrEqual(69)
  })
})

describe('validateImageFile', () => {
  it('accepts the formats MED-02 allows', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']) {
      expect(validateImageFile(fileOf('a', type, 1000))).toBeNull()
    }
  })

  it('rejects SVG with the security reason, not a generic message', () => {
    // R-04: same-origin SVG is a script vector. The message has to say why, or
    // it reads as an arbitrary restriction and someone will "fix" it.
    const reason = validateImageFile(fileOf('logo.svg', 'image/svg+xml', 1000))
    expect(reason).toMatch(/script/i)
  })

  it('rejects a PDF masquerading as an upload', () => {
    expect(validateImageFile(fileOf('cv.pdf', 'application/pdf', 1000))).toMatch(/not an image/i)
  })

  it('rejects a file with no type at all', () => {
    expect(validateImageFile(fileOf('mystery', '', 1000))).not.toBeNull()
  })

  it('rejects anything over the size cap and says the actual size', () => {
    const reason = validateImageFile(fileOf('big.jpg', 'image/jpeg', MAX_UPLOAD_BYTES + 1))
    expect(reason).toContain('10.0 MB')
  })

  it('accepts a file exactly at the cap', () => {
    expect(validateImageFile(fileOf('edge.jpg', 'image/jpeg', MAX_UPLOAD_BYTES))).toBeNull()
  })
})

describe('formatBytes', () => {
  it('formats across the three magnitudes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
