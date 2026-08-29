import { cn } from '@/lib/cn'

/**
 * Skeleton — PRD 32.4, LOAD-01.
 *
 * "Skeletons must match final dimensions; if they cannot, reserve space
 * instead." A skeleton that is the wrong size is worse than none: it produces
 * the layout shift it exists to prevent (PERF-03, CLS < 0.1).
 *
 * The shimmer is a CSS animation, so the reduced-motion rule in globals.css
 * flattens it to a static block automatically (A11Y-10).
 *
 * `aria-hidden` throughout: a skeleton is a placeholder, not content. The
 * loading state is announced once by the container, not once per grey box.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-surface-raised block animate-pulse rounded-(--radius-sm)',
        'motion-reduce:animate-none',
        className,
      )}
    />
  )
}

/**
 * Text skeleton at the final line-height, so a paragraph does not jump when
 * the real copy arrives (12.3 loading state). The last line is short, which is
 * what real text does.
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={cn('block space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn('h-[1lh] w-full', i === lines - 1 && lines > 1 && 'w-3/5')}
        />
      ))}
    </span>
  )
}

/**
 * FR-PROJ-11 / 39 — a card skeleton with the SAME geometry as <ProjectCard>:
 * 16:9 cover, two title lines, two description lines, a chip row. If the card
 * changes shape, this must change with it.
 */
export function ProjectCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="border-subtle bg-surface overflow-hidden rounded-(--radius-lg) border"
    >
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-4/5" />
        <SkeletonText lines={2} />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-14" />
        </div>
      </div>
    </div>
  )
}

/**
 * The one place a loading state is announced. Wraps skeletons in a live region
 * so a screen-reader user is told something is happening, once (A11Y-12).
 */
export function LoadingRegion({
  label = 'Loading',
  className,
  children,
}: {
  label?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  )
}
