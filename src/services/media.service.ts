import { formatBytes, processImage } from '@/lib/image'
import { reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
import type { Tables, TablesInsert } from '@/types/database.types'

/**
 * Admin media + resume storage — PRD 26, MED-01…04, FR-RES-01…06, FR-ADM-12.
 *
 * Every write here is authorised by `is_admin()` inside the storage RLS
 * policies, not by this module. A session alone is not enough: an
 * authenticated non-admin gets a policy violation from Postgres, which is the
 * only place that decision is safe to make.
 *
 * Buckets (created in the storage migration):
 *   profile   public   avatar
 *   projects  public   covers and gallery images
 *   resume    PRIVATE  the PDF — reachable only via a 60s signed URL
 */

export type UploadBucket = 'profile' | 'projects'

/**
 * Mirrors `file_size_limit` in the storage-buckets migration. Kept here so the
 * UI can refuse an over-limit object with a sentence naming the actual limit,
 * instead of surfacing the platform's opaque 413.
 *
 * These apply to the PROCESSED WebP, not the file the user picked — see
 * MAX_UPLOAD_BYTES in lib/image.ts for why those are different numbers.
 *
 * If the migration changes, change this. The check below is a courtesy; the
 * bucket is what actually enforces it.
 */
export const BUCKET_LIMITS: Record<UploadBucket, number> = {
  profile: 5 * 1024 * 1024,
  projects: 8 * 1024 * 1024,
}

/** MED-01 — one row per stored object in the browser. */
export type MediaObject = {
  name: string
  path: string
  bucket: UploadBucket
  sizeBytes: number | null
  createdAt: string | null
  mimeType: string | null
}

/**
 * Keys are prefixed with a date and suffixed with a random token.
 *
 * Without the token, re-uploading `cover.webp` for a second project silently
 * overwrites the first project's image — Supabase Storage keys are a flat
 * namespace and `upsert: false` would instead fail the second upload with a
 * confusing 409. The date prefix keeps the bucket browsable in chronological
 * order rather than as one undifferentiated list.
 */
function storageKey(prefix: string, fileName: string): string {
  const stamp = new Date().toISOString().slice(0, 10)
  const token = crypto.randomUUID().slice(0, 8)
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '')
  return `${cleanPrefix}/${stamp}-${token}-${fileName}`
}

/* --- Images ---------------------------------------------------------------- */

export type UploadedImage = {
  path: string
  width: number
  height: number
  sizeBytes: number
  /** So the UI can show what the MED-04 pipeline actually saved. */
  originalBytes: number
}

/**
 * MED-04 — resize to WebP in the browser, then upload. The original never
 * leaves the machine.
 */
export async function uploadImage(
  bucket: UploadBucket,
  pathPrefix: string,
  file: File,
): Promise<UploadedImage> {
  const context = 'media.uploadImage'
  try {
    const processed = await processImage(file)

    // Checked AFTER processing, because that is the object the bucket sees.
    const limit = BUCKET_LIMITS[bucket]
    if (processed.blob.size > limit) {
      throw new Error(
        `Even after optimising, this image is ${formatBytes(processed.blob.size)} — ` +
          `over the ${formatBytes(limit)} limit for the ${bucket} bucket. ` +
          `Try cropping it or reducing its dimensions.`,
      )
    }

    const path = storageKey(pathPrefix, processed.fileName)

    const { error } = await supabase.storage.from(bucket).upload(path, processed.blob, {
      contentType: 'image/webp',
      // Never silently replace: the random token makes collisions essentially
      // impossible, so a collision here means something is genuinely wrong.
      upsert: false,
      cacheControl: '31536000',
    })
    if (error) throw error

    return {
      path,
      width: processed.width,
      height: processed.height,
      sizeBytes: processed.blob.size,
      originalBytes: processed.originalBytes,
    }
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/** MED-01 — the bucket browser. Recurses one level, which is how keys are shaped. */
export async function listMedia(bucket: UploadBucket): Promise<MediaObject[]> {
  const context = 'media.listMedia'
  try {
    const { data: folders, error } = await supabase.storage.from(bucket).list('', { limit: 100 })
    if (error) throw error

    const results: MediaObject[] = []
    for (const entry of folders ?? []) {
      // A row with no `id` is a folder placeholder, not an object.
      if (entry.id) {
        results.push(toMediaObject(bucket, '', entry))
        continue
      }
      const { data: children } = await supabase.storage
        .from(bucket)
        .list(entry.name, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
      for (const child of children ?? []) {
        if (child.id) results.push(toMediaObject(bucket, entry.name, child))
      }
    }

    return results.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  } catch (cause) {
    throw reportError(cause, context)
  }
}

type StorageEntry = {
  name: string
  id?: string | null
  created_at?: string | null
  metadata?: { size?: number; mimetype?: string } | null
}

function toMediaObject(bucket: UploadBucket, folder: string, entry: StorageEntry): MediaObject {
  return {
    name: entry.name,
    path: folder ? `${folder}/${entry.name}` : entry.name,
    bucket,
    sizeBytes: entry.metadata?.size ?? null,
    createdAt: entry.created_at ?? null,
    mimeType: entry.metadata?.mimetype ?? null,
  }
}

export async function deleteMedia(bucket: UploadBucket, path: string): Promise<void> {
  const context = 'media.deleteMedia'
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * MED-05 — objects in the bucket that no database row references.
 *
 * Computed in the browser rather than in SQL because `storage.objects` is not
 * exposed through PostgREST. Both sides are small (tens of rows), so a set
 * difference here is cheaper than adding an RPC.
 */
export async function findOrphanedMedia(bucket: UploadBucket): Promise<MediaObject[]> {
  const context = 'media.findOrphanedMedia'
  try {
    const objects = await listMedia(bucket)
    const referenced = new Set<string>()

    if (bucket === 'projects') {
      const [{ data: covers }, { data: images }] = await Promise.all([
        supabase.from('projects').select('cover_image_path, og_image_path'),
        supabase.from('project_images').select('storage_path'),
      ])
      for (const row of covers ?? []) {
        if (row.cover_image_path) referenced.add(row.cover_image_path)
        if (row.og_image_path) referenced.add(row.og_image_path)
      }
      for (const row of images ?? []) referenced.add(row.storage_path)
    } else {
      const { data } = await supabase.from('profiles').select('avatar_path')
      for (const row of data ?? []) if (row.avatar_path) referenced.add(row.avatar_path)
    }

    return objects.filter((object) => !referenced.has(object.path))
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Project gallery rows -------------------------------------------------- */

/**
 * MED-03 / A11Y-06 — alt text is required at insert, not "eventually".
 *
 * The database enforces it too (`project_images.alt_text` is NOT NULL and the
 * publish gate re-checks). This guard exists so the admin gets a sentence
 * instead of a constraint violation.
 */
export async function addProjectImage(values: TablesInsert<'project_images'>): Promise<void> {
  const context = 'media.addProjectImage'
  try {
    if (!values.alt_text?.trim()) {
      throw new Error('Alt text is required before an image can be attached.')
    }
    const { error } = await supabase.from('project_images').insert(values)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function listProjectImages(projectId: string): Promise<Tables<'project_images'>[]> {
  const context = 'media.listProjectImages'
  try {
    const { data, error } = await supabase
      .from('project_images')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return data ?? []
  } catch (cause) {
    throw reportError(cause, context)
  }
}

export async function updateProjectImage(
  id: string,
  values: { alt_text?: string; caption?: string | null; sort_order?: number },
): Promise<void> {
  const context = 'media.updateProjectImage'
  try {
    if (values.alt_text !== undefined && !values.alt_text.trim()) {
      throw new Error('Alt text cannot be emptied on a stored image.')
    }
    const { error } = await supabase.from('project_images').update(values).eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * Removes the row AND the object. Order matters: the row goes first, so a
 * failure leaves an orphaned object (which MED-05 surfaces) rather than a row
 * pointing at a file that no longer exists (which renders as a broken image).
 */
export async function deleteProjectImage(id: string, storagePath: string): Promise<void> {
  const context = 'media.deleteProjectImage'
  try {
    const { error } = await supabase.from('project_images').delete().eq('id', id)
    if (error) throw error
    await supabase.storage.from('projects').remove([storagePath])
  } catch (cause) {
    throw reportError(cause, context)
  }
}
