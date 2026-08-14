import { AlertCircle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { AppError } from '@/lib/errors'

/**
 * Empty and error states — PRD 32.4, 38.
 *
 * These exist as single components on purpose: the PRD calls each "the one
 * pattern used everywhere". Four hand-rolled empty states drift into four
 * different tones, and the tone is the point.
 *
 * ERR-01 restated: every asynchronous operation resolves into exactly one of
 * four visible states — loading, empty, error, or content. A silent no-op is a
 * defect. These cover two of the four.
 */

/**
 * 32.4: "Written as an invitation ('Add your first project'), never an
 * apology." A visitor seeing an empty portfolio should read intent, not
 * breakage.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-subtle bg-surface/40 flex flex-col items-center justify-center',
        'rounded-[--radius-lg] border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      <span className="text-muted mb-4" aria-hidden="true">
        {icon ?? <Inbox className="size-7" />}
      </span>
      <p className="text-primary font-display text-lg font-semibold">{title}</p>
      {description && <p className="text-secondary measure mt-2 text-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/**
 * PRD 38 — a section-level failure renders here and the rest of the page still
 * renders. `role="alert"` because a failure that appears after the fact needs
 * announcing; the empty state above does not, since it is present at load.
 *
 * SEC-11: only `AppError.userMessage` is ever shown. Raw driver text could
 * carry SQL, a column name, or confirmation that a draft slug exists.
 */
export function ErrorState({
  title = "Couldn't load this section",
  error,
  description,
  onRetry,
  className,
}: {
  title?: string
  error?: unknown
  description?: string
  onRetry?: () => void
  className?: string
}) {
  const message =
    description ??
    (error instanceof AppError ? error.userMessage : 'Something went wrong. Please try again.')

  const retryable = error instanceof AppError ? error.isRetryable : true

  return (
    <div
      role="alert"
      className={cn(
        'border-danger/25 bg-danger-soft/40 flex flex-col items-center justify-center',
        'rounded-[--radius-lg] border px-6 py-12 text-center',
        className,
      )}
    >
      <AlertCircle className="text-danger mb-4 size-7" aria-hidden="true" />
      <p className="text-primary font-display text-lg font-semibold">{title}</p>
      <p className="text-secondary measure mt-2 text-sm">{message}</p>
      {onRetry && retryable && (
        <Button variant="secondary" size="sm" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
