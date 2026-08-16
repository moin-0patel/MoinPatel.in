import { reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
import type { Tables } from '@/types/database.types'
import type { PublishedResume } from '@/types/domain'

/**
 * Resume service — PRD 19, TD-08.
 *
 * The resume lives in a PRIVATE bucket. A public bucket would give a document
 * containing personal contact details a stable, permanently crawlable URL that
 * outlives any decision to take it down (R-05).
 *
 * Access is therefore two-step: read the published row's metadata (allowed by
 * `resume_versions_select_public`), then mint a short-lived signed URL for
 * exactly that object (allowed by `storage_resume_read_published`). Both
 * halves are scoped to the published version, so an unpublished one is
 * unreachable even with its path (AC-RES-4).
 */

/** FR-RES-03. Deliberately short — long enough to download, not to share. */
const SIGNED_URL_TTL_SECONDS = 60

/**
 * The single published version, or null. FR-RES-06: null means every resume
 * CTA is hidden site-wide rather than rendered and broken.
 */
export async function getPublishedResume(): Promise<PublishedResume | null> {
  const context = 'resume.getPublishedResume'
  try {
    const { data, error } = await supabase
      .from('resume_versions')
      .select('id, storage_path, file_name, version_label, file_size_bytes')
      .eq('is_published', true) // API-02
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      id: data.id,
      storagePath: data.storage_path,
      fileName: data.file_name,
      versionLabel: data.version_label,
      fileSizeBytes: data.file_size_bytes,
    }
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * A 60-second signed URL for the published resume.
 *
 * Minted on demand rather than cached: a URL cached for the query's 5-minute
 * staleTime would be expired for most of its life, and the user would click a
 * Download button that fails. Callers should request this at click time.
 */
export async function getSignedResumeUrl(storagePath: string): Promise<string | null> {
  const context = 'resume.getSignedResumeUrl'
  try {
    const { data, error } = await supabase.storage
      .from('resume')
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, { download: false })

    if (error) throw error
    return data.signedUrl
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/* --- Admin — FR-RES-01, FR-RES-02, FR-RES-05 ------------------------------- */

export type ResumeVersion = Tables<'resume_versions'>

/**
 * Mirrors `file_size_limit` on the private `resume` bucket in the storage
 * migration. This said 20 MB while the bucket says 10 MB, which would have let
 * a 15 MB scan pass client validation and then fail at the platform with an
 * opaque error. The bucket is authoritative; this exists to say so first, in a
 * sentence.
 */
export const MAX_RESUME_BYTES = 10 * 1024 * 1024

/**
 * FR-RES-05 — the full history, newest first. Admin-only by RLS
 * (`resume_versions_all_admin`); anon can read only the published row.
 */
export async function listResumeVersions(): Promise<ResumeVersion[]> {
  const context = 'resume.listResumeVersions'
  try {
    const { data, error } = await supabase
      .from('resume_versions')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data ?? []
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/** Refused before upload rather than after, so a 20 MB POST is never started. */
export function validateResumeFile(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return 'The resume must be a PDF.'
  }
  if (file.size > MAX_RESUME_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB.`
  }
  if (file.size === 0) {
    return 'That file is empty.'
  }
  return null
}

/**
 * FR-RES-01 — store the PDF in the private bucket and record the row.
 *
 * Uploaded as a DRAFT (`is_published: false`). Publishing is a separate,
 * deliberate step: uploading a new file should never silently swap what the
 * public sees before it has been checked.
 *
 * The object is written first. If the row insert then fails we delete the
 * object again — otherwise the bucket accumulates files nothing references,
 * and a private bucket has no orphan browser to find them with.
 */
export async function uploadResumeVersion(
  file: File,
  options: { versionLabel?: string; notes?: string } = {},
): Promise<ResumeVersion> {
  const context = 'resume.uploadResumeVersion'
  const invalid = validateResumeFile(file)
  if (invalid) throw reportError(new Error(invalid), context)

  const stamp = new Date().toISOString().slice(0, 10)
  const token = crypto.randomUUID().slice(0, 8)
  const safeName =
    file.name
      .replace(/\.pdf$/i, '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'resume'
  const storagePath = `${stamp}-${token}-${safeName}.pdf`

  try {
    const { error: uploadError } = await supabase.storage
      .from('resume')
      .upload(storagePath, file, { contentType: 'application/pdf', upsert: false })
    if (uploadError) throw uploadError

    const { data, error } = await supabase
      .from('resume_versions')
      .insert({
        storage_path: storagePath,
        file_name: file.name,
        mime_type: 'application/pdf',
        file_size_bytes: file.size,
        version_label: options.versionLabel?.trim() || null,
        notes: options.notes?.trim() || null,
        is_published: false,
      })
      .select('*')
      .single()

    if (error) {
      // Roll the object back so a failed insert cannot leave an unreferenced
      // file in a bucket with no orphan detection.
      await supabase.storage.from('resume').remove([storagePath])
      throw error
    }

    return data
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * FR-RES-05 — publish one version, unpublishing whatever held the slot.
 *
 * FR-RES-02 backs this with a unique partial index on `is_published`, so two
 * published rows are impossible even if this function is called concurrently.
 * That means the ORDER here matters: unpublish everything first, then publish
 * the target. Doing it the other way round transiently violates the index and
 * the second statement fails.
 */
export async function publishResumeVersion(id: string): Promise<void> {
  const context = 'resume.publishResumeVersion'
  try {
    const { error: clearError } = await supabase
      .from('resume_versions')
      .update({ is_published: false })
      .eq('is_published', true)
      .neq('id', id)
    if (clearError) throw clearError

    const { error } = await supabase
      .from('resume_versions')
      .update({ is_published: true })
      .eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * FR-RES-06 — unpublishing is allowed and hides every resume CTA site-wide.
 */
export async function unpublishResumeVersion(id: string): Promise<void> {
  const context = 'resume.unpublishResumeVersion'
  try {
    const { error } = await supabase
      .from('resume_versions')
      .update({ is_published: false })
      .eq('id', id)
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/** Row first, then object — same reasoning as deleteProjectImage. */
export async function deleteResumeVersion(id: string, storagePath: string): Promise<void> {
  const context = 'resume.deleteResumeVersion'
  try {
    const { error } = await supabase.from('resume_versions').delete().eq('id', id)
    if (error) throw error
    await supabase.storage.from('resume').remove([storagePath])
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * An admin-side signed URL for ANY version, published or not.
 *
 * Distinct from `getSignedResumeUrl`, which the public path uses: that one
 * works only for the published object because
 * `storage_resume_read_published` scopes it that way. This one relies on
 * `storage_resume_admin_read`, so an admin can preview a draft before
 * publishing it — which is the entire point of uploading as a draft.
 */
export async function getAdminResumeUrl(storagePath: string): Promise<string | null> {
  const context = 'resume.getAdminResumeUrl'
  try {
    const { data, error } = await supabase.storage
      .from('resume')
      .createSignedUrl(storagePath, 300, { download: false })
    if (error) throw error
    return data.signedUrl
  } catch (cause) {
    throw reportError(cause, context)
  }
}
