import { reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
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
