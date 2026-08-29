import { AlertTriangle, Copy, ImageOff, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { SEO } from '@/components/common/SEO'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDeleteMedia, useMediaObjects, useOrphanedMedia } from '@/hooks/useMedia'
import { useToast } from '@/hooks/useToast'
import { formatBytes } from '@/lib/image'
import { cn } from '@/lib/cn'
import { pageTitle } from '@/lib/seo'
import { publicStorageUrl } from '@/lib/storage'
import type { UploadBucket } from '@/services/media.service'

/**
 * Admin → Media — PRD MED-01, MED-05, MED-07.
 *
 * A browser for the two PUBLIC buckets. The private `resume` bucket is
 * deliberately absent: its objects are managed as versions on the Resume
 * screen, and listing them here would invite deleting a file out from under a
 * published row.
 */

const BUCKETS: { id: UploadBucket; label: string; hint: string }[] = [
  { id: 'projects', label: 'Projects', hint: 'Covers, gallery and architecture images.' },
  { id: 'profile', label: 'Profile', hint: 'Avatar and the default share image.' },
]

export default function AdminMediaPage() {
  const [bucket, setBucket] = useState<UploadBucket>('projects')
  const [showOrphansOnly, setShowOrphansOnly] = useState(false)

  const { data: objects, isPending } = useMediaObjects(bucket)
  // MED-05 walks every project row, so it is fetched only when asked for.
  const { data: orphans, isFetching: findingOrphans } = useOrphanedMedia(bucket, showOrphansOnly)
  const remove = useDeleteMedia(bucket)
  const toast = useToast()

  const orphanPaths = new Set((orphans ?? []).map((o) => o.path))
  const visible = showOrphansOnly ? (orphans ?? []) : (objects ?? [])

  const handleDelete = (path: string, isOrphan: boolean) => {
    const warning = isOrphan
      ? `Delete "${path}"? Nothing references it.`
      : `"${path}" is STILL REFERENCED by a project. Deleting it will leave a broken image. Delete anyway?`
    if (!window.confirm(warning)) return
    void remove
      .mutateAsync(path)
      .then(() => toast.success('File deleted.'))
      .catch((cause) => toast.error('Could not delete that file.', cause))
  }

  return (
    <>
      <SEO title={pageTitle('Media · Admin')} noindex />

      <header>
        <h1 className="text-primary">Media</h1>
        <p className="text-secondary measure mt-2 text-sm">
          Everything stored in the public buckets. Images are converted to WebP and capped at 1920px
          before upload, so what is here is already optimised.
        </p>
      </header>

      {/* Bucket switch. Radio semantics, because exactly one is active. */}
      <div className="mt-6 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Bucket">
        {BUCKETS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={bucket === entry.id}
            onClick={() => setBucket(entry.id)}
            className={cn(
              'rounded-(--radius-md) px-3 py-1.5 text-sm',
              'transition-colors duration-(--duration-hover) ease-(--ease-out)',
              bucket === entry.id
                ? 'bg-accent-strong text-accent-ink'
                : 'text-secondary hover:text-primary hover:bg-surface-raised',
            )}
          >
            {entry.label}
          </button>
        ))}

        <label className="text-secondary ml-auto inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showOrphansOnly}
            onChange={(event) => setShowOrphansOnly(event.target.checked)}
            className="accent-(--color-accent)"
          />
          Unreferenced only
        </label>
      </div>

      <p className="text-muted mt-2 text-xs">{BUCKETS.find((b) => b.id === bucket)?.hint}</p>

      {showOrphansOnly && (
        <p className="text-warning mt-4 inline-flex items-center gap-2 text-sm">
          <AlertTriangle className="size-4" aria-hidden="true" />
          {findingOrphans
            ? 'Cross-referencing against project rows…'
            : `${orphans?.length ?? 0} file(s) no database row points at.`}
        </p>
      )}

      {isPending ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="border-subtle mt-8 rounded-(--radius-lg) border border-dashed py-16 text-center">
          <ImageOff className="text-muted mx-auto size-8" aria-hidden="true" />
          <p className="text-secondary mt-3 text-sm">
            {showOrphansOnly
              ? 'Nothing unreferenced — every file is in use.'
              : 'This bucket is empty. Images are uploaded from the project editor.'}
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((object) => {
            const url = publicStorageUrl(bucket, object.path)
            const isOrphan = showOrphansOnly || orphanPaths.has(object.path)
            return (
              // min-w-0: the same grid-item overflow trap that put ~112px of
              // horizontal scroll on the homepage. Long storage keys are
              // exactly the kind of content that triggers it.
              <li
                key={object.path}
                className="border-subtle bg-surface min-w-0 overflow-hidden rounded-(--radius-lg) border"
              >
                <div className="bg-surface-raised aspect-video overflow-hidden">
                  {url && (
                    <img
                      src={url}
                      // Decorative in this context: the filename below is the
                      // real label, and inventing alt text for a file browser
                      // would just duplicate it for screen-reader users.
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                  )}
                </div>

                <div className="p-3">
                  <p className="text-primary truncate text-sm" title={object.path}>
                    {object.name}
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {object.sizeBytes ? formatBytes(object.sizeBytes) : 'unknown size'}
                    {object.createdAt
                      ? ` · ${new Date(object.createdAt).toLocaleDateString()}`
                      : ''}
                  </p>

                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void navigator.clipboard.writeText(object.path)
                        toast.success('Storage path copied.')
                      }}
                    >
                      <Copy className="size-4" aria-hidden="true" />
                      Copy path
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(object.path, isOrphan)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      <span className="visually-hidden">Delete {object.name}</span>
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
