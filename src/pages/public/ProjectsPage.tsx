import { X } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ProjectCard } from '@/components/common/ProjectCard'
import { SEO } from '@/components/common/SEO'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/Button'
import { LoadingRegion, ProjectCardSkeleton } from '@/components/ui/Skeleton'
import { NoProjectsYet } from '@/sections/FeaturedProjectsSection'
import { useProjects } from '@/hooks/useProjects'
import { useSettings } from '@/hooks/useSiteContent'
import { cn } from '@/lib/cn'
import { pageTitle } from '@/lib/seo'
import type { ProjectCategory } from '@/types/domain'

/**
 * Project index — PRD 13.1.
 *
 * FR-PROJ-07: filters are combinable, shareable via URL, and clearable in one
 * action. The URL is the state (30.3) — not a `useState` mirror of it — so the
 * back button works, a filtered view can be pasted into a message, and the
 * "What I Build" cards can deep-link straight into a category.
 *
 * FR-PROJ-03 restated: drafts, archived and private projects are excluded by
 * RLS, not by anything on this page. The service also applies the predicate
 * (FE-05, deliberate duplication), and neither is what makes it safe.
 */

const CATEGORY_FILTERS: { value: ProjectCategory; label: string }[] = [
  { value: 'ai_automation', label: 'AI Automation' },
  { value: 'web_application', label: 'Web Applications' },
  { value: 'business_process_automation', label: 'Process Automation' },
  { value: 'data_reporting', label: 'Data & Reporting' },
  { value: 'other', label: 'Other' },
]

const VALID_CATEGORIES = new Set(CATEGORY_FILTERS.map((c) => c.value))

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: settings } = useSettings()

  /*
   * Unknown values in the URL are dropped rather than treated as an error. A
   * stale or hand-edited link should degrade to "no filter", never to a broken
   * page — the same reasoning as FR-CONT-02's fallback to `other`.
   */
  const selectedCategories = useMemo(
    () =>
      searchParams
        .getAll('category')
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value): value is ProjectCategory =>
          VALID_CATEGORIES.has(value as ProjectCategory),
        ),
    [searchParams],
  )

  const {
    data: projects,
    isPending,
    isError,
    error,
    refetch,
    isPlaceholderData,
  } = useProjects({ categories: selectedCategories })

  const toggleCategory = useCallback(
    (category: ProjectCategory) => {
      const next = new URLSearchParams(searchParams)
      next.delete('category')
      const updated = selectedCategories.includes(category)
        ? selectedCategories.filter((c) => c !== category)
        : [...selectedCategories, category]
      for (const value of updated) next.append('category', value)
      // `replace` so filtering does not stack twenty history entries between
      // the page a visitor arrived from and the one they want to go back to.
      setSearchParams(next, { replace: true })
    },
    [searchParams, selectedCategories, setSearchParams],
  )

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('category')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const hasFilters = selectedCategories.length > 0

  return (
    <>
      <SEO
        title={pageTitle('Projects')}
        description="Case studies of AI automation systems, internal web applications and business process automation built by Moin Patel."
        canonicalPath="/projects"
      />

      <div className="container-page py-12 md:py-20">
        <header className="mb-10">
          <p aria-hidden="true" className="text-accent mb-3 font-mono text-xs uppercase">
            Selected work
          </p>
          <h1 className="text-primary">Projects</h1>
          <p className="text-secondary measure mt-4">
            Each project is written up as a case study: the problem in business terms, the mechanism
            underneath, and what actually changed.
          </p>
        </header>

        {/* FR-PROJ-04 — a multi-select chip row reflected in the URL. */}
        <div className="mb-8">
          <h2 id="filters-heading" className="visually-hidden">
            Filter projects by category
          </h2>
          <div
            role="group"
            aria-labelledby="filters-heading"
            className="flex flex-wrap items-center gap-2"
          >
            {CATEGORY_FILTERS.map((filter) => {
              const isActive = selectedCategories.includes(filter.value)
              return (
                <button
                  key={filter.value}
                  type="button"
                  // aria-pressed is what makes a toggle button announce its
                  // state; without it this is just a button that looks blue.
                  aria-pressed={isActive}
                  onClick={() => toggleCategory(filter.value)}
                  className={cn(
                    'h-11 rounded-[--radius-sm] border px-3 text-sm md:h-9',
                    'transition-colors duration-[--duration-hover] ease-[--ease-out]',
                    isActive
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-subtle text-secondary hover:border-strong hover:text-primary',
                  )}
                >
                  {filter.label}
                </button>
              )
            })}

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-3.5" aria-hidden="true" />
                Clear filters
              </Button>
            )}
          </div>

          {/* A11Y-12 — the result count is announced when filters change. */}
          <p role="status" aria-live="polite" className="visually-hidden">
            {isPending
              ? 'Loading projects'
              : `${projects?.length ?? 0} project${projects?.length === 1 ? '' : 's'} shown`}
          </p>
        </div>

        <ProjectGrid
          projects={projects}
          isPending={isPending}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          isStale={isPlaceholderData}
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          maintenanceMode={settings?.maintenanceMode ?? false}
        />
      </div>
    </>
  )
}

function ProjectGrid({
  projects,
  isPending,
  isError,
  error,
  onRetry,
  isStale,
  hasFilters,
  onClearFilters,
}: {
  projects: ReturnType<typeof useProjects>['data']
  isPending: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
  isStale: boolean
  hasFilters: boolean
  onClearFilters: () => void
  maintenanceMode: boolean
}) {
  // FR-PROJ-11 — six skeletons with the same geometry as real cards.
  if (isPending) {
    return (
      <LoadingRegion label="Loading projects" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </LoadingRegion>
    )
  }

  if (isError) return <ErrorState error={error} onRetry={onRetry} />

  if (!projects || projects.length === 0) {
    // FR-PROJ-10 distinguishes the two empties, because they mean different
    // things to a visitor: "your filter is too narrow" is recoverable, "there
    // is nothing here yet" is not, and offering "Clear filters" for the
    // latter would be nonsense.
    return hasFilters ? (
      <EmptyState
        title="No projects match these filters"
        description="Try removing a filter to see more."
        action={
          <Button variant="secondary" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <NoProjectsYet />
    )
  }

  return (
    <ul
      className={cn(
        'grid gap-4 md:grid-cols-2 xl:grid-cols-3',
        // PRD 39 — on a filter change the existing results dim rather than
        // being replaced by skeletons, which avoids a jarring re-layout.
        'transition-opacity duration-[--duration-hover]',
        isStale && 'opacity-60',
      )}
    >
      {projects.map((project) => (
        // `min-w-0` for the same reason as FeaturedProjectsSection: a grid
        // item defaults to `min-width: auto`, and the card's `aspect-video`
        // cover box turns a wrapped title into extra HEIGHT, which the aspect
        // ratio converts back into WIDTH. Without this the track pins at 478px
        // and /projects scrolls horizontally at 375px (RES-12).
        <li key={project.id} className="flex min-w-0">
          <div className="flex w-full">
            <ProjectCard project={project} />
          </div>
        </li>
      ))}
    </ul>
  )
}
