import { CheckCircle2, Eye, FileText, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { SEO } from '@/components/common/SEO'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useAdminResumeUrl,
  useDeleteResumeVersion,
  usePublishResume,
  useResumeVersions,
  useUnpublishResume,
  useUploadResume,
} from '@/hooks/useMedia'
import { useToast } from '@/hooks/useToast'
import { formatBytes } from '@/lib/image'
import { pageTitle } from '@/lib/seo'
import { MAX_RESUME_BYTES, validateResumeFile, type ResumeVersion } from '@/services/resume.service'

/**
 * Admin → Resume — PRD FR-RES-01, FR-RES-02, FR-RES-05, FR-ADM-12.
 *
 * Upload creates a DRAFT. Publishing is a second, deliberate action, so a new
 * file never silently replaces what visitors see before it has been looked at.
 * FR-RES-02's partial unique index means publishing one version unpublishes
 * the other automatically — history is retained either way.
 */
export default function AdminResumePage() {
  const { data: versions, isPending } = useResumeVersions()
  const upload = useUploadResume()
  const publish = usePublishResume()
  const unpublish = useUnpublishResume()
  const remove = useDeleteResumeVersion()
  const previewUrl = useAdminResumeUrl()
  const toast = useToast()

  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [versionLabel, setVersionLabel] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)

  const published = versions?.find((v) => v.is_published) ?? null

  const handleFile = (chosen: File | null) => {
    setFile(null)
    setFileError(null)
    if (!chosen) return
    // Refused here rather than after a 10 MB POST that was never going to land.
    const invalid = validateResumeFile(chosen)
    if (invalid) {
      setFileError(invalid)
      return
    }
    setFile(chosen)
  }

  const handleUpload = async () => {
    if (!file) return
    try {
      await upload.mutateAsync({ file, versionLabel })
      toast.success('Uploaded as a draft. Publish it when you are ready.')
      setFile(null)
      setVersionLabel('')
      if (fileInput.current) fileInput.current.value = ''
    } catch (cause) {
      // SEC-11: pass the caught value, never `cause.message` — useToast
      // surfaces only AppError.userMessage and drops everything else.
      toast.error('The upload failed.', cause)
    }
  }

  const handlePreview = async (version: ResumeVersion) => {
    try {
      const url = await previewUrl.mutateAsync(version.storage_path)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Could not generate a preview link.')
    }
  }

  return (
    <>
      <SEO title={pageTitle('Resume · Admin')} noindex />

      <header>
        <h1 className="text-primary">Resume</h1>
        <p className="text-secondary measure mt-2 text-sm">
          The PDF is stored privately. Visitors receive a 60-second signed link, never a permanent
          URL.
        </p>
      </header>

      {/*
       * FR-RES-06 — stated plainly, because the consequence is site-wide and
       * not obvious from this screen alone.
       */}
      {!isPending && !published && (
        <p
          role="status"
          className="border-warning/30 bg-warning-soft text-warning mt-6 rounded-(--radius-md) border px-4 py-3 text-sm"
        >
          No version is published, so every resume link is hidden across the site and /resume shows
          a neutral message.
        </p>
      )}

      <section aria-labelledby="upload-heading" className="mt-8">
        <h2 id="upload-heading" className="text-primary text-lg font-semibold">
          Upload a new version
        </h2>

        <div className="border-subtle bg-surface mt-4 rounded-(--radius-lg) border p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="resume-file"
                className="text-secondary mb-1.5 block text-sm font-medium"
              >
                PDF file
              </label>
              <input
                id="resume-file"
                ref={fileInput}
                type="file"
                accept="application/pdf"
                onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
                aria-describedby="resume-file-hint"
                className="text-secondary file:bg-accent-strong w-full text-sm file:mr-3 file:rounded-(--radius-sm) file:border-0 file:px-3 file:py-2 file:text-accent-ink"
              />
              <p id="resume-file-hint" className="text-muted mt-1.5 text-xs">
                PDF only, up to {formatBytes(MAX_RESUME_BYTES)}.
              </p>
              {fileError && (
                <p role="alert" className="text-danger mt-2 text-sm">
                  {fileError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="version-label"
                className="text-secondary mb-1.5 block text-sm font-medium"
              >
                Version label <span className="text-muted font-normal">(optional)</span>
              </label>
              <Input
                id="version-label"
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
                placeholder="e.g. August 2026"
                maxLength={60}
              />
            </div>
          </div>

          <Button
            className="mt-5"
            onClick={() => void handleUpload()}
            disabled={!file}
            loading={upload.isPending}
          >
            <Upload className="size-4" aria-hidden="true" />
            Upload as draft
          </Button>
        </div>
      </section>

      <section aria-labelledby="history-heading" className="mt-10">
        <h2 id="history-heading" className="text-primary text-lg font-semibold">
          Version history
        </h2>

        {isPending ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !versions || versions.length === 0 ? (
          <p className="text-muted mt-4 text-sm">No versions uploaded yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {versions.map((version) => (
              <li
                key={version.id}
                className={
                  version.is_published
                    ? 'border-accent/40 bg-accent-soft rounded-(--radius-lg) border p-4'
                    : 'border-subtle bg-surface rounded-(--radius-lg) border p-4'
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-primary flex items-center gap-2 font-medium">
                      <FileText className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{version.version_label ?? version.file_name}</span>
                      {version.is_published && (
                        <span className="text-accent inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          Published
                        </span>
                      )}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                      {new Date(version.uploaded_at).toLocaleDateString()}
                      {version.file_size_bytes ? ` · ${formatBytes(version.file_size_bytes)}` : ''}
                      {version.version_label ? ` · ${version.file_name}` : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => void handlePreview(version)}>
                      <Eye className="size-4" aria-hidden="true" />
                      Preview
                    </Button>

                    {version.is_published ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void unpublish.mutateAsync(version.id)}
                        loading={unpublish.isPending}
                      >
                        Unpublish
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => void publish.mutateAsync(version.id)}
                        loading={publish.isPending}
                      >
                        Publish
                      </Button>
                    )}

                    {/*
                     * Deleting the published version is blocked rather than
                     * confirmed. It would take every resume link on the site
                     * down as a side effect of a click meant to tidy history —
                     * unpublish first, so that consequence is the explicit act.
                     */}
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={version.is_published}
                      title={
                        version.is_published
                          ? 'Unpublish this version before deleting it.'
                          : undefined
                      }
                      onClick={() => {
                        if (!window.confirm(`Delete "${version.file_name}" permanently?`)) return
                        void remove
                          .mutateAsync({ id: version.id, storagePath: version.storage_path })
                          .then(() => toast.success('Version deleted.'))
                          .catch(() => toast.error('Could not delete that version.'))
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      <span className="visually-hidden">Delete {version.file_name}</span>
                    </Button>
                  </div>
                </div>

                {version.notes && <p className="text-secondary mt-3 text-sm">{version.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
