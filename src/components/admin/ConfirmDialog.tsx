import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'

/**
 * ConfirmDialog — PRD FR-ADM-04.
 *
 * "Every destructive action requires a confirmation dialog NAMING THE RECORD;
 * deletes of records with children explain the cascade."
 *
 * Both halves matter. A generic "Are you sure?" is a reflex click — the user
 * confirms without reading and loses the wrong row. Naming the record forces a
 * moment of recognition, and spelling out the cascade is the difference
 * between deleting a project and discovering afterwards that its nine pipeline
 * steps and twelve screenshots went with it.
 */
export function ConfirmDialog({
  trigger,
  title,
  /** The record's own name. Rendered prominently — this is the whole point. */
  recordName,
  description,
  /** What else disappears. Omit only when genuinely nothing cascades. */
  cascadeNote,
  confirmLabel = 'Delete',
  onConfirm,
}: {
  trigger: ReactNode
  title: string
  recordName: string
  description?: string
  cascadeNote?: string
  confirmLabel?: string
  onConfirm: () => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState(false)

  const handleConfirm = async () => {
    setWorking(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      // Reset even on failure: the dialog stays open so the toast explaining
      // the failure is visible next to the action that produced it.
      setWorking(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-base/80 fixed inset-0 z-50 backdrop-blur-sm" />
        {/* A11Y-11 — Radix supplies role=dialog, aria-modal, the focus trap,
            Esc, and focus restoration to the trigger. */}
        <Dialog.Content className="bg-surface-raised border-subtle fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-(--radius-xl) border p-6 shadow-(--shadow-overlay)">
          <div className="flex items-start gap-3">
            <span className="bg-danger-soft text-danger grid size-9 shrink-0 place-items-center rounded-(--radius-sm)">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-primary font-display text-lg font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-secondary mt-2 text-sm">
                {description ?? 'This cannot be undone.'}
              </Dialog.Description>
            </div>
          </div>

          {/* The record, named. */}
          <p className="border-subtle bg-base text-primary mt-4 truncate rounded-(--radius-sm) border px-3 py-2 font-mono text-sm">
            {recordName}
          </p>

          {cascadeNote && (
            <p className="text-warning border-warning/30 bg-warning-soft mt-3 rounded-(--radius-sm) border px-3 py-2 text-xs">
              {cascadeNote}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button variant="secondary" disabled={working}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button variant="danger" loading={working} onClick={() => void handleConfirm()}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
