import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import { ToastContext, type Toast, type ToastTone } from '@/app/toastContext'
import { cn } from '@/lib/cn'

/**
 * Toast system — PRD FR-NAV-07, 32.4.
 *
 * "A global toast system reports success/error for every user-initiated
 * mutation." Reporting is not optional: ERR-01 makes a silent no-op a defect,
 * and in the admin a save that appears to do nothing is indistinguishable from
 * a save that failed.
 *
 * Spec from 32.4: top-right on desktop, top-centre on mobile, auto-dismiss
 * after 5s (8s for errors), max 3 stacked, pausable on hover.
 */

const AUTO_DISMISS_MS: Record<ToastTone, number> = {
  success: 5000,
  info: 5000,
  // Errors get longer because they usually carry something to act on, and a
  // message that vanishes before it is read is worse than none.
  error: 8000,
}

const MAX_VISIBLE = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const schedule = useCallback(
    (id: string, tone: ToastTone) => {
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS[tone])
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  const show = useCallback(
    (message: string, tone: ToastTone = 'success', description?: string) => {
      counter.current += 1
      const id = `toast-${counter.current}`
      setToasts((current) => {
        // Oldest falls off the top rather than growing an unbounded stack.
        const next = [...current, { id, message, description, tone }]
        const overflow = next.length - MAX_VISIBLE
        if (overflow > 0) {
          for (const dropped of next.slice(0, overflow)) {
            const timer = timers.current.get(dropped.id)
            if (timer) clearTimeout(timer)
            timers.current.delete(dropped.id)
          }
          return next.slice(overflow)
        }
        return next
      })
      schedule(id, tone)
      return id
    },
    [schedule],
  )

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/*
       * One live region that persists across toasts, rather than a live region
       * per toast. A region added to the DOM at the same moment as its content
       * is frequently missed by screen readers — the announcement fires before
       * the region is being observed.
       */}
      <div
        className={cn(
          'pointer-events-none fixed z-[100] flex flex-col gap-2 p-4',
          // 32.4 — top-centre on mobile, top-right on desktop.
          'inset-x-0 top-0 items-center',
          'md:inset-x-auto md:right-0 md:items-end',
        )}
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
            onPause={() => {
              const timer = timers.current.get(toast.id)
              if (timer) {
                clearTimeout(timer)
                timers.current.delete(toast.id)
              }
            }}
            onResume={() => {
              if (!timers.current.has(toast.id)) schedule(toast.id, toast.tone)
            }}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const TONE_STYLE: Record<ToastTone, string> = {
  success: 'border-success/30 bg-surface-raised',
  error: 'border-danger/40 bg-surface-raised',
  info: 'border-subtle bg-surface-raised',
}

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

const TONE_ICON_COLOUR: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
}

function ToastCard({
  toast,
  onDismiss,
  onPause,
  onResume,
}: {
  toast: Toast
  onDismiss: () => void
  onPause: () => void
  onResume: () => void
}) {
  const Icon = TONE_ICON[toast.tone]

  return (
    <div
      // 32.4 — `alert` interrupts for errors; `status` waits its turn for the
      // rest, so a successful save does not talk over what the user is doing.
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      // Pausing on focus too, so a keyboard user reaching the dismiss button
      // does not have it disappear mid-reach.
      onFocus={onPause}
      onBlur={onResume}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3',
        'rounded-[--radius-md] border p-3.5 shadow-[--shadow-overlay]',
        TONE_STYLE[toast.tone],
      )}
    >
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', TONE_ICON_COLOUR[toast.tone])}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-primary text-sm font-medium">{toast.message}</p>
        {toast.description && <p className="text-secondary mt-0.5 text-sm">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-muted hover:text-primary -m-1 shrink-0 rounded p-1"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
