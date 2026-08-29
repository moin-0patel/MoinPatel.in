import * as Dialog from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { cn } from '@/lib/cn'
import { imageSizes, publicStorageUrl } from '@/lib/storage'
import type { ProjectImage } from '@/types/domain'

/**
 * Gallery + Lightbox — PRD FR-CASE-07, A11Y-11, A11Y-16.
 *
 * Built on Radix Dialog rather than by hand: focus trapping, `Esc`, backdrop
 * dismissal, `aria-modal`, body scroll lock and focus restoration to the
 * trigger are all behaviour that is expensive and error-prone to write
 * correctly (29.3 says exactly this). Arrow-key navigation and the position
 * announcement are ours.
 *
 * A11Y-16: fully keyboard operable, and it announces "Image 2 of 5" — a
 * lightbox that shows position only as a visual counter tells a screen-reader
 * user nothing about where they are.
 */
export function Gallery({
  images,
  projectTitle,
}: {
  images: ProjectImage[]
  projectTitle: string
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (images.length === 0) return null

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => {
          const url = publicStorageUrl('projects', image.storagePath)
          if (!url) return null
          return (
            <li key={image.id}>
              <figure>
                <button
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  className={cn(
                    'group border-subtle bg-surface block w-full overflow-hidden',
                    'rounded-(--radius-lg) border',
                    'transition-colors duration-(--duration-hover) ease-(--ease-out)',
                    'hover:border-strong',
                  )}
                  // The alt text is already the button's name via the <img>;
                  // this states what activating it does.
                  aria-label={`View larger: ${image.altText}`}
                >
                  <img
                    src={url}
                    alt={image.altText}
                    loading="lazy"
                    decoding="async"
                    // MED-05 — dimensions captured at upload, so the box is
                    // reserved before the bytes arrive (PERF-03).
                    width={image.width ?? undefined}
                    height={image.height ?? undefined}
                    sizes={imageSizes('card')}
                    className="aspect-video w-full object-cover transition-transform duration-(--duration-hover) group-hover:scale-[1.02] motion-reduce:scale-100"
                  />
                </button>
                {image.caption && (
                  <figcaption className="text-muted mt-2 text-sm">{image.caption}</figcaption>
                )}
              </figure>
            </li>
          )
        })}
      </ul>

      {openIndex !== null && (
        <Lightbox
          images={images}
          index={openIndex}
          projectTitle={projectTitle}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  )
}

function Lightbox({
  images,
  index,
  projectTitle,
  onIndexChange,
  onClose,
}: {
  images: ProjectImage[]
  index: number
  projectTitle: string
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const count = images.length
  const image = images[index]

  const go = useCallback(
    (delta: number) => {
      // Wraps in both directions — a gallery that dead-ends at either edge
      // makes the arrow keys feel broken.
      onIndexChange((index + delta + count) % count)
    },
    [index, count, onIndexChange],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        go(-1)
      }
      // Esc is Radix's job.
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [go])

  if (!image) return null

  const url = publicStorageUrl('projects', image.storagePath)

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-base/90 fixed inset-0 z-50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex flex-col p-4 md:p-8"
          aria-describedby={undefined}
        >
          {/* A11Y-11 — the dialog is labelled. The title is visually hidden
              because the image is the content; the label is for the a11y tree. */}
          <Dialog.Title className="visually-hidden">
            {projectTitle} — image {index + 1} of {count}
          </Dialog.Title>

          <div className="flex items-center justify-between gap-4">
            {/* A11Y-16 — position announced, not just displayed. */}
            <p
              className="text-muted font-mono text-xs tracking-(--tracking-mono)"
              role="status"
              aria-live="polite"
            >
              Image {index + 1} of {count}
            </p>
            <Dialog.Close
              className="text-secondary hover:text-primary grid size-11 place-items-center rounded-(--radius-sm)"
              aria-label="Close image viewer"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center gap-2 md:gap-4">
            {count > 1 && (
              <NavButton onClick={() => go(-1)} label="Previous image">
                <ChevronLeft className="size-5" aria-hidden="true" />
              </NavButton>
            )}

            {url && (
              <img
                src={url}
                alt={image.altText}
                className="max-h-full max-w-full rounded-(--radius-lg) object-contain"
              />
            )}

            {count > 1 && (
              <NavButton onClick={() => go(1)} label="Next image">
                <ChevronRight className="size-5" aria-hidden="true" />
              </NavButton>
            )}
          </div>

          {/* FR-CASE-07 — caption and alt text are preserved in the lightbox,
              not dropped on the way in. */}
          {image.caption && (
            <p className="text-secondary mx-auto mt-4 max-w-2xl text-center text-sm">
              {image.caption}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        // RES-07 — 44px touch target.
        'border-subtle bg-surface/80 text-secondary grid size-11 shrink-0 place-items-center',
        'rounded-full border backdrop-blur-sm',
        'transition-colors duration-(--duration-hover) ease-(--ease-out)',
        'hover:text-primary hover:border-strong',
      )}
    >
      {children}
    </button>
  )
}
