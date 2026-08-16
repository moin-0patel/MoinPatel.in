import { AlertCircle, ImageUp, Loader2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useUploadImage } from '@/hooks/useMedia'
import { cn } from '@/lib/cn'
import { formatBytes, validateImageFile } from '@/lib/image'
import type { UploadBucket, UploadedImage } from '@/services/media.service'

/**
 * ImageUploader — PRD 31.5, MED-01…04, A11Y-06.
 *
 * "Client resize → WebP → upload → record row."
 *
 * ALT TEXT IS PART OF THE UPLOAD, NOT A FOLLOW-UP
 *
 * The button stays disabled until alt text is typed. MED-03 and A11Y-06 both
 * require it before publish, and the publish gate enforces it — but catching it
 * there means an admin finishes a project, hits Publish, and is sent back to a
 * tab they thought they had finished. Capturing it at the moment the image is
 * chosen is the only point where the person still has the picture in mind and
 * can describe it in one line.
 *
 * `requireAlt={false}` exists for the cover image on the profile bucket, where
 * the alt lives on the parent row instead.
 */
export function ImageUploader({
  bucket,
  pathPrefix,
  requireAlt = true,
  label = 'Upload an image',
  onUploaded,
}: {
  bucket: UploadBucket
  /** Folder inside the bucket, e.g. a project id. */
  pathPrefix: string
  requireAlt?: boolean
  label?: string
  onUploaded: (image: UploadedImage, altText: string) => void | Promise<void>
}) {
  const inputId = useId()
  const altId = useId()
  const fileInput = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [altText, setAltText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const upload = useUploadImage(bucket, pathPrefix)

  const reset = () => {
    setFile(null)
    setAltText('')
    setError(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const choose = (chosen: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setError(null)
    setFile(null)

    if (!chosen) return
    const invalid = validateImageFile(chosen)
    if (invalid) {
      setError(invalid)
      return
    }
    setFile(chosen)
    // Object URL rather than a FileReader data URL: no base64 copy of a
    // multi-megabyte image in memory. Revoked above and after upload.
    setPreview(URL.createObjectURL(chosen))
  }

  const submit = async () => {
    if (!file) return
    setError(null)
    try {
      const uploaded = await upload.mutateAsync(file)
      await onUploaded(uploaded, altText.trim())
      reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The upload failed.')
    }
  }

  const missingAlt = requireAlt && altText.trim() === ''

  return (
    <div className="border-subtle bg-surface rounded-[--radius-lg] border p-4">
      <label htmlFor={inputId} className="text-secondary mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
        aria-describedby={`${inputId}-hint`}
        className="text-secondary file:bg-accent-strong w-full text-sm file:mr-3 file:rounded-[--radius-sm] file:border-0 file:px-3 file:py-2 file:text-white"
      />
      <p id={`${inputId}-hint`} className="text-muted mt-1.5 text-xs">
        Resized to 1920px and converted to WebP in your browser before upload. Location data in the
        original is discarded.
      </p>

      {file && (
        <div className="mt-4 flex gap-4">
          {preview && (
            <img
              src={preview}
              alt=""
              className="border-subtle size-24 shrink-0 rounded-[--radius-md] border object-cover"
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-primary truncate text-sm">{file.name}</p>
            <p className="text-muted text-xs">{formatBytes(file.size)} before optimising</p>

            {requireAlt && (
              <div className="mt-3">
                <label htmlFor={altId} className="text-secondary mb-1 block text-sm font-medium">
                  Alt text <span className="text-danger">*</span>
                </label>
                <input
                  id={altId}
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  maxLength={200}
                  aria-describedby={`${altId}-hint`}
                  aria-invalid={missingAlt || undefined}
                  placeholder="Describe what the image shows"
                  className={cn(
                    'border-strong bg-base text-primary w-full rounded-[--radius-sm] border px-3 py-2 text-sm',
                    'focus:border-accent focus:outline-none',
                  )}
                />
                <p id={`${altId}-hint`} className="text-muted mt-1 text-xs">
                  Required. Describe the content, not the file — &ldquo;dashboard showing recipe
                  costs by category&rdquo;, not &ldquo;screenshot&rdquo;.
                </p>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => void submit()}
                disabled={missingAlt}
                loading={upload.isPending}
                title={missingAlt ? 'Alt text is required before uploading.' : undefined}
              >
                {upload.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ImageUp className="size-4" aria-hidden="true" />
                )}
                Upload
              </Button>
              <Button size="sm" variant="ghost" onClick={reset} disabled={upload.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-danger mt-3 flex items-start gap-2 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
