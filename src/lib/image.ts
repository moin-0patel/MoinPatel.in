/**
 * Client-side image processing — PRD MED-04, PERF-07, TD-09.
 *
 * "Images are converted to WebP and resized to a max edge of 1920px in the
 * browser before upload; the original is not stored."
 *
 * WHY IN THE BROWSER
 *
 * Supabase's image transformation API is plan-dependent (TD-09), and server
 * -side processing would mean an Edge Function, a queue, or a paid tier. Doing
 * it on the client before the bytes ever leave costs nothing, keeps the
 * free-tier storage and egress footprint small, and means the only copy that
 * exists anywhere is the optimised one.
 *
 * A side effect worth stating plainly: re-encoding through a canvas DROPS ALL
 * EXIF METADATA, including GPS coordinates. Phone photos routinely carry the
 * location they were taken. Uploading one straight to a public bucket would
 * publish that. This pipeline removes it as a matter of course rather than as
 * a feature anyone has to remember to switch on.
 *
 * Pure and DOM-only: no Supabase client, no network. That keeps it in `lib/`
 * under FE-01 and makes it unit-testable without mocking a service.
 */

/** MED-04. The longest edge of the stored image, in CSS pixels. */
export const MAX_EDGE = 1920

/**
 * WebP quality. 0.82 is the knee of the curve for photographic content —
 * visually indistinguishable from 0.95 at roughly half the bytes.
 */
const WEBP_QUALITY = 0.82

/** MED-02. Rejected before any decoding work happens. */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const

/**
 * A cap on the file the user PICKS, not on what gets stored.
 *
 * The two are different numbers and conflating them causes a bug in either
 * direction. The bucket limits (5 MB profile, 8 MB projects) apply to the
 * processed WebP, which is typically a fraction of the original — a 9 MB phone
 * JPEG routinely lands under 1 MB. Rejecting that at 8 MB here would refuse a
 * file that would have uploaded perfectly.
 *
 * So this exists only to stop an absurd decode (a 200 MB TIFF eating the tab's
 * memory). The real limit is enforced against the processed blob, per
 * destination bucket, in media.service.ts.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export type ProcessedImage = {
  blob: Blob
  width: number
  height: number
  /** Extension-corrected name, e.g. `photo.jpg` → `photo.webp`. */
  fileName: string
  originalBytes: number
}

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageProcessingError'
  }
}

/**
 * Validates a candidate file. Returns a human-readable reason, or null if fine.
 *
 * Separate from processing so the form can refuse a file the instant it is
 * chosen, rather than after a decode that was never going to succeed.
 */
export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    // SVG is deliberately absent: it is a script-capable document, and serving
    // user-supplied SVG from the same origin is an XSS vector (R-04).
    return file.type === 'image/svg+xml'
      ? 'SVG is not accepted — it can carry scripts. Export a PNG or JPEG instead.'
      : `${file.type || 'That file type'} is not an image we accept. Use JPEG, PNG, WebP, AVIF or GIF.`
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`
  }
  return null
}

/** Scales so the longest edge is at most `maxEdge`. Never enlarges. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge = MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  // Round rather than floor: flooring both edges can shift the aspect ratio
  // enough to letterbox a 16:9 cover by a pixel.
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** `Photo 1.JPG` → `photo-1.webp`. Storage keys stay lowercase and URL-safe. */
export function toWebpFileName(original: string): string {
  const base = original.replace(/\.[^.]+$/, '') || 'image'
  const safe = base
    .toLowerCase()
    .normalize('NFKD')
    // NFKD splits 'ç' into 'c' + U+0327. Without this the combining mark falls
    // into the [^a-z0-9] class below and becomes a hyphen, so 'façade' keys as
    // 'fac-ade'. Drop the marks and keep the base letter.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return `${safe || 'image'}.webp`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Decode → downscale → re-encode as WebP.
 *
 * `imageOrientation: 'from-image'` matters: a portrait phone photo is often
 * stored landscape with an EXIF rotation flag. Since we are about to discard
 * the EXIF, the rotation has to be baked into the pixels first — otherwise
 * every such photo silently uploads on its side.
 */
export async function processImage(file: File, maxEdge = MAX_EDGE): Promise<ProcessedImage> {
  const invalid = validateImageFile(file)
  if (invalid) throw new ImageProcessingError(invalid)

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageProcessingError(
      'That image could not be read. It may be corrupt or in an unsupported format.',
    )
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge)

    const canvas = createCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new ImageProcessingError('This browser cannot process images.')
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await canvasToWebp(canvas)
    if (!blob) {
      throw new ImageProcessingError('This browser cannot produce WebP images.')
    }

    return {
      blob,
      width,
      height,
      fileName: toWebpFileName(file.name),
      originalBytes: file.size,
    }
  } finally {
    // Frees the decoded pixels immediately instead of waiting for GC. A few
    // 12-megapixel uploads in a row is tens of MB otherwise.
    bitmap.close()
  }
}

/* --- environment plumbing -------------------------------------------------- */

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement

function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function canvasToWebp(canvas: AnyCanvas): Promise<Blob | null> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: 'image/webp', quality: WEBP_QUALITY }).catch(() => null)
  }
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', WEBP_QUALITY)
  })
}
