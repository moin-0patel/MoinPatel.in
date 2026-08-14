import { env } from './env'

/**
 * Storage URL helpers — PRD 26.
 *
 * A pure URL builder, deliberately not a service: the `profile` and `projects`
 * buckets are public, so their objects need no client, no session and no round
 * trip. Putting this in `lib/` lets presentational components resolve an image
 * path without reaching through a hook, and without violating FE-01 (they are
 * not touching the Supabase client — there is no client here).
 *
 * The private `resume` bucket is the exception and is NOT handled here: it
 * needs a signed URL minted per request, which is `resume.service.ts`.
 */

export type PublicBucket = 'profile' | 'projects'

/** Public object URL. Returns null for a null path so callers can branch once. */
export function publicStorageUrl(bucket: PublicBucket, path: string | null): string | null {
  if (!path) return null
  // Already absolute — an admin may have pasted a full URL.
  if (/^https?:\/\//i.test(path)) return path
  const clean = path.replace(/^\/+/, '')
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${clean}`
}

/**
 * PERF-07 / RES-11 — a `srcset` so a phone never downloads a 1920px asset.
 *
 * Supabase's image transformations are plan-dependent (TD-09), so V1 does not
 * rely on them: images are resized to a max edge of 1920px in the browser
 * before upload (MED-04) and served at one size. This helper exists so the
 * call sites are already shaped correctly, and `sizes` still tells the browser
 * how much space the image occupies — which is what lets it pick sensibly once
 * transformations are enabled.
 */
export function imageSizes(layout: 'card' | 'hero' | 'full'): string {
  switch (layout) {
    case 'card':
      return '(min-width: 1280px) 400px, (min-width: 768px) 45vw, 100vw'
    case 'hero':
      return '(min-width: 1280px) 420px, (min-width: 768px) 360px, 200px'
    case 'full':
      return '(min-width: 1280px) 1200px, 100vw'
  }
}
