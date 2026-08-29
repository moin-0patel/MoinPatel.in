import { ExternalLink, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { ErrorState, EmptyState } from '@/components/common/States'
import { Badge, PublicationBadge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAdminProjects, useDeleteProject, useSetProjectPublicationState } from '@/hooks/useAdmin'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/cn'
import type { AdminProjectRow, PublicationState } from '@/types/domain'

/**
 * Admin projects — PRD FR-ADM-03, FR-ADM-06, 20.2.
 *
 * The publish control is the reason this screen exists today: three projects
 * are seeded as drafts pending disclosure permission (Q-06/Q-07), and this is
 * where they get flipped once that permission is confirmed.
 *
 * The full project editor (20.3 — tabbed form, slug generator, pipeline step
 * editor, image manager, publish gate) is the next piece of Phase 13. This
 * list deliberately ships first because it unblocks publishing content that
 * already exists, which is the actual bottleneck.
 */
export default function AdminProjectsPage() {
  const { data: projects, isPending, isError, error, refetch } = useAdminProjects()
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<PublicationState | 'all'>('all')

  const filtered = useMemo(() => {
    if (!projects) return []
    const term = search.trim().toLowerCase()
    return projects.filter((project) => {
      const matchesState = stateFilter === 'all' || project.publication_state === stateFilter
      const matchesSearch =
        term === '' ||
        project.title.toLowerCase().includes(term) ||
        project.slug.toLowerCase().includes(term)
      return matchesState && matchesSearch
    })
  }, [projects, search, stateFilter])

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-primary text-2xl">Projects</h1>
          <p className="text-secondary mt-1 text-sm">
            {projects ? `${projects.length} total` : 'Loading…'}
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/projects/new">
            <Plus className="size-4" aria-hidden="true" />
            New project
          </Link>
        </Button>
      </div>

      {/* FR-ADM-03 — search and state filter on every list view. */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="project-search" className="visually-hidden">
            Search projects
          </label>
          <Input
            id="project-search"
            type="search"
            placeholder="Search by title or slug…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div role="group" aria-label="Filter by state" className="flex gap-1.5">
          {(['all', 'draft', 'published', 'archived'] as const).map((state) => (
            <button
              key={state}
              type="button"
              aria-pressed={stateFilter === state}
              onClick={() => setStateFilter(state)}
              className={cn(
                'h-11 rounded-(--radius-sm) border px-3 text-sm capitalize md:h-9',
                stateFilter === state
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-subtle text-secondary hover:border-strong',
              )}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {isPending ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-(--radius-lg)" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={projects.length === 0 ? 'Add your first project' : 'Nothing matches'}
            description={
              projects.length === 0
                ? 'A project becomes a case study: the problem, the mechanism, and what changed.'
                : 'Try a different search or state filter.'
            }
            action={
              projects.length === 0 ? (
                <Button asChild>
                  <Link to="/admin/projects/new">Add your first project</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          /* RES-06 — stacked record cards, not a table. A table with eight
             columns is unusable at 390px, and the PRD requires the primary
             action to be reachable without horizontal scroll. */
          <ul className="space-y-2">
            {filtered.map((project) => (
              <li key={project.id}>
                <ProjectRow project={project} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ProjectRow({ project }: { project: AdminProjectRow }) {
  const toast = useToast()
  const setPublicationState = useSetProjectPublicationState()
  const deleteProject = useDeleteProject()

  const handleStateChange = (state: PublicationState) => {
    setPublicationState.mutate(
      { id: project.id, state },
      {
        onSuccess: () =>
          toast.success(
            state === 'published' ? 'Published' : state === 'draft' ? 'Moved to draft' : 'Archived',
            project.title,
          ),
        // FR-NAV-07 / SEC-11 — the toast shows AppError.userMessage only.
        onError: (cause) => toast.error("Couldn't change the state", cause),
      },
    )
  }

  return (
    <article className="border-subtle bg-surface rounded-(--radius-lg) border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-primary truncate font-medium">{project.title}</h2>
            {project.is_featured && (
              <Badge tone="accent">
                <Star className="size-3" aria-hidden="true" />
                Featured
              </Badge>
            )}
          </div>
          <p className="text-muted mt-1 truncate font-mono text-xs">/{project.slug}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <PublicationBadge state={project.publication_state} />
            <StatusBadge status={project.status} />
            {/* FR-PROJ-16 — a visible reminder that this project must not name
                its employer anywhere until disclosure is confirmed. */}
            {!project.client_disclosed && <Badge tone="outline">Client undisclosed</Badge>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="secondary" size="sm" asChild>
            <Link to={`/admin/projects/${project.id}/edit`}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
              <span className="visually-hidden">{project.title}</span>
            </Link>
          </Button>

          {project.publication_state === 'published' && (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/projects/${project.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" aria-hidden="true" />
                View
                <span className="visually-hidden">
                  {project.title} on the public site (opens in a new tab)
                </span>
              </Link>
            </Button>
          )}

          {/* FR-ADM-04 — confirmation names the record and explains the
              cascade, because images, pipeline steps and technology links go
              with it (PRD 24). */}
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" aria-label={`Delete ${project.title}`}>
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            }
            title="Delete this project?"
            recordName={project.title}
            description="This permanently removes the project and everything attached to it."
            cascadeNote="Its images, pipeline steps and technology links are deleted with it. Uploaded files in Storage are not yet removed automatically — see Phase 14."
            onConfirm={() =>
              new Promise<void>((resolve) => {
                deleteProject.mutate(project.id, {
                  onSuccess: () => {
                    toast.success('Project deleted', project.title)
                    resolve()
                  },
                  onError: (cause) => {
                    toast.error("Couldn't delete the project", cause)
                    resolve()
                  },
                })
              })
            }
          />
        </div>
      </div>

      {/*
       * FR-ADM-06 — a single explicit segmented control, never an ambiguous
       * toggle. "Published" as a switch cannot express archived, and leaves
       * the user guessing which way is live.
       */}
      <div className="border-subtle mt-3 flex items-center gap-2 border-t pt-3">
        <span
          id={`state-label-${project.id}`}
          className="text-muted font-mono text-xs tracking-(--tracking-mono) uppercase"
        >
          State
        </span>
        <div
          role="group"
          aria-labelledby={`state-label-${project.id}`}
          className="border-subtle flex overflow-hidden rounded-(--radius-sm) border"
        >
          {(['draft', 'published', 'archived'] as const).map((state) => {
            const isActive = project.publication_state === state
            return (
              <button
                key={state}
                type="button"
                aria-pressed={isActive}
                disabled={setPublicationState.isPending}
                onClick={() => handleStateChange(state)}
                className={cn(
                  'px-3 py-1.5 text-xs capitalize',
                  'transition-colors duration-(--duration-hover) ease-(--ease-out)',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  isActive
                    ? // accent-strong, not accent: --color-accent is the light text tone.
                      'bg-accent-strong text-accent-ink'
                    : 'text-secondary hover:text-primary hover:bg-surface-raised',
                )}
              >
                {state}
              </button>
            )
          })}
        </div>
      </div>
    </article>
  )
}
