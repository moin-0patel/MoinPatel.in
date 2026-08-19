import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ProjectCard } from '@/components/common/ProjectCard'
import { Section, SectionHeading } from '@/components/common/Section'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/Button'
import { LoadingRegion, ProjectCardSkeleton } from '@/components/ui/Skeleton'
import { useFeaturedProjects } from '@/hooks/useProjects'
import { env } from '@/lib/env'

/**
 * Featured Projects — PRD 12.6.
 *
 * Proves the claims with real systems. Up to three cards; the service already
 * applies the FR-HOME fallback of using the three most recent published
 * projects when nothing is explicitly featured.
 *
 * 12.6 "Empty": with zero published projects the section hides ENTIRELY rather
 * than rendering an apologetic placeholder. That is the current state — all
 * three projects are seeded as draft pending Q-06/Q-07 — and a homepage that
 * simply does not have a work section reads far better than one advertising
 * that it has no work.
 */
export function FeaturedProjectsSection() {
  const { data: projects, isPending, isError, error, refetch } = useFeaturedProjects(3)

  if (isPending) {
    return (
      <Section id="featured-projects" labelledBy="featured-projects-heading">
        <SectionHeading
          id="featured-projects-heading"
          eyebrow="Selected work"
          meta="MODULES_LOADED"
          title="Recent systems"
        />
        <LoadingRegion
          label="Loading projects"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </LoadingRegion>
      </Section>
    )
  }

  if (isError) {
    return (
      <Section id="featured-projects" labelledBy="featured-projects-heading">
        <SectionHeading
          id="featured-projects-heading"
          eyebrow="Selected work"
          meta="MODULES_LOADED"
          title="Recent systems"
        />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Section>
    )
  }

  if (projects.length === 0) {
    if (env.isDev) {
      // 12.6 — a dev-only warning, because in development an empty grid is
      // usually a broken query, while in production it is a content state.
      console.warn(
        '[FeaturedProjectsSection] No published projects. Section hidden. ' +
          'Expected while Q-06/Q-07 are unanswered — all seeded projects are drafts.',
      )
    }
    return null
  }

  return (
    <Section id="featured-projects" labelledBy="featured-projects-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          id="featured-projects-heading"
          eyebrow="Selected work"
          meta="MODULES_LOADED"
          title="Recent systems"
          description="Each one is a case study: the problem, the mechanism, and what changed."
          className="mb-0"
        />
        <Button variant="ghost" asChild className="mb-1">
          <Link to="/projects">
            View all projects
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {/*
       * The `min-w-0` on the <li> and its child is load-bearing, not tidying.
       * A grid item defaults to `min-width: auto`, so the track can never
       * shrink below the card's min-content width. The card contains an
       * `aspect-video` cover box, and when no cover image exists the fallback
       * tile holds the project title: a narrower card wraps that title onto
       * more lines, which makes the box taller, which the aspect ratio
       * converts straight back into WIDTH. That feedback loop settled at 478px
       * and forced ~112px of horizontal page scroll at 430px and below
       * (RES-12). `min-w-0` breaks it — width comes from the track, height
       * follows from the ratio.
       */}
      <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <li key={project.id} className="flex min-w-0">
            <div className="flex w-full min-w-0">
              <ProjectCard project={project} />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** Exported for `/projects` to reuse the same empty copy (FR-PROJ-10). */
export function NoProjectsYet() {
  return (
    <EmptyState
      title="Case studies are being added"
      description="Projects are written up one at a time. Check back shortly, or get in touch to hear about the work directly."
      action={
        <Button variant="secondary" asChild>
          <Link to="/contact">Let&rsquo;s Talk</Link>
        </Button>
      }
    />
  )
}
