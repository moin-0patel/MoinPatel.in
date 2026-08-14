import { useContext, useMemo } from 'react'

import { ToastContext } from '@/app/toastContext'
import { AppError } from '@/lib/errors'

/**
 * FR-NAV-07 — report success/error for every user-initiated mutation.
 *
 * `error()` takes the thrown value rather than a string on purpose: SEC-11
 * forbids leaking schema detail, SQL or stack traces into user-facing copy, so
 * the unwrapping happens here once instead of at every call site where someone
 * might reach for `err.message`.
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used inside <ToastProvider>.')
  }

  const { show, dismiss } = context

  return useMemo(
    () => ({
      success: (message: string, description?: string) => show(message, 'success', description),
      info: (message: string, description?: string) => show(message, 'info', description),
      /** Pass the caught value; only AppError.userMessage is ever displayed. */
      error: (message: string, cause?: unknown) =>
        show(message, 'error', cause instanceof AppError ? cause.userMessage : undefined),
      dismiss,
    }),
    [show, dismiss],
  )
}
