import { createContext } from 'react'

/**
 * Toast context — kept separate from ToastProvider.tsx so that file exports
 * only a component, which keeps Fast Refresh working on it.
 */

export type ToastTone = 'success' | 'error' | 'info'

export type Toast = {
  id: string
  message: string
  description?: string
  tone: ToastTone
}

export type ToastApi = {
  /** Returns the toast id, so a caller can dismiss it early if it wants. */
  show: (message: string, tone?: ToastTone, description?: string) => string
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastApi | undefined>(undefined)
