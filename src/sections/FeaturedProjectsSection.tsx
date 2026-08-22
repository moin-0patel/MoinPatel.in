import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ProjectPlate } from '@/components/common/ProjectPlate'
import { Section, SectionHeading } from '@/components/common/Section'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/Button'
import { LoadingRegion, ProjectCardSkeleton } from '@/components/ui/Skeleton'
import { useFeaturedProjects } from '@/hooks/useProjects'
import { env } from '@/lib/env'

/**
 * Selected Systems — PRD 12.6, presented as an editorial showcase.
 *
 * Proves the claims with real systems. The service already applies the FR-HOME
 * fallback of using the three most recent published projects when nothing is
 * explicitly featured.
 *
 * ONE PROJECT PER COMPOSITION, not a three-column grid. The grid made every
 * project the same size as every other and the same size as a thumbnail, which
 * is the wrong claim: these are products someone can open, not images. Each
 * plate gets the full measure — display-scale title, the verified claim band,
 * technology, and a live link where one exists.
 *
 * The live URL is the primary action. Today every project is
 * `visibility_mode = 'case_study_only'` with a null `live_url`, so every plate
 * currently renders its documented-only state instead. That is the honest
 * state of the data, not a placeholder: the path is wired end to end, and the
 * moment a URL is added through the admin and the mode is widened, the link
 * appears with no code change.
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
      <Section id="featured-projects" labelledBy="featured-projects-heading" chapter="projects">
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
      <Section id="featured-projects" labelledBy="featured-projects-heading" chapter="projects">
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
    <Section id="featured-projects" labelledBy="featured-projects-heading" chapter="projects">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          id="featured-projects-heading"
          eyebrow="Selected systems"
          meta="SYSTEMS_INDEX"
          title="Systems I've built"
          description="Each one solved a real operational problem. The problem, the mechanism, and what changed."
          className="mb-0"
        />
        <Button variant="ghost" asChild className="mb-1">
          <Link to="/projects">
            All projects
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {/*
       * An ordered list, because the numbering is real: these are presented in
       * a deliberate order and the numerals on each plate are decorative
       * duplicates of it. `ol` gives that to a screen reader for free, which is
       * why the visible numeral can be aria-hidden.
       */}
      <ol className="mt-[--section-gap] flex flex-col gap-[--section-gap]">
        {projects.map((project, index) => (
          <li key={project.id} className="min-w-0">
            <ProjectPlate project={project} index={index} />
          </li>
        ))}
      </ol>
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
