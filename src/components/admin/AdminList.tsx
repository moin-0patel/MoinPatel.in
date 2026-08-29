import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'

import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * The one admin list pattern — PRD 30.2 (`<DataTable>`), FR-ADM-03.
 *
 * Not a table. RES-06 requires admin lists to become stacked record cards
 * below 768px and to be usable at 390px without horizontal scroll, and a
 * six-column table cannot do that — so the card layout is the only layout,
 * rather than a table with a mobile fallback that nobody tests.
 *
 * Exists as a shared shell so the four remaining resource screens cannot each
 * invent their own loading, empty and error handling. ERR-01: every async
 * operation resolves into exactly one of loading, empty, error or content.
 */
export function AdminList<T>({
  title,
  description,
  items,
  isPending,
  isError,
  error,
  onRetry,
  onCreate,
  createLabel = 'Add',
  emptyTitle,
  emptyDescription,
  renderItem,
  children,
}: {
  title: string
  description?: string
  items: T[] | undefined
  isPending: boolean
  isError: boolean
  error?: unknown
  onRetry: () => void
  onCreate?: () => void
  createLabel?: string
  emptyTitle: string
  emptyDescription?: string
  renderItem: (item: T, index: number) => ReactNode
  /** Rendered between the header and the list — an inline create form, say. */
  children?: ReactNode
}) {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-primary text-2xl">{title}</h1>
          {description && <p className="text-secondary mt-1 text-sm">{description}</p>}
        </div>
        {onCreate && (
          <Button onClick={onCreate}>
            <Plus className="size-4" aria-hidden="true" />
            {createLabel}
          </Button>
        )}
      </div>

      {children}

      <div className="mt-6">
        {isPending ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-(--radius-lg)" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : !items || items.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={onCreate ? <Button onClick={onCreate}>{createLabel}</Button> : undefined}
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index}>{renderItem(item, index)}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** A record card. The primary action stays reachable without horizontal scroll. */
export function AdminCard({
  title,
  subtitle,
  badges,
  actions,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <article className="border-subtle bg-surface rounded-(--radius-lg) border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-primary font-medium">{title}</h2>
          {subtitle && <p className="text-secondary mt-1 text-sm">{subtitle}</p>}
          {badges && <div className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </article>
  )
}
