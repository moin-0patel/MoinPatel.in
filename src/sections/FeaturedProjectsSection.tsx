import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { WorkCard } from '@/components/common/WorkCard'
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
 * THE REFERENCE'S COMPOSITION, MEASURED
 *
 * Captured from the live reference at 1440x900 with real wheel events — the
 * site drives Lenis and ScrollTrigger, and `window.scrollTo` leaves it
 * mid-timeline rendering a state no visitor ever sees, which is how an earlier
 * pass came away with the wrong background colour.
 *
 *   section       #work, 1440 x 3600, padding 0
 *   ground        near-black. Median luminance across the viewport: About 206,
 *                 Work 19, Overview 198 — a dark plate between two cream ones
 *   heading       65.95px / 500, white, left, with a body paragraph in a
 *                 narrow column top-right beside it
 *   cards         389 x 550, radius 11.95px, 30px apart, in a 1118px window
 *   mechanism     pinned for 2700px while a nine-card track slides from
 *                 translateX(-539px) to translateX(-3235px)
 *
 * WHAT DIFFERS HERE, AND WHY
 *
 * The pin. It exists to spend 2623px of horizontal travel; three cards have
 * none to spend, so the row is static at the same proportions. See the row's
 * own comment.
 *
 * Nine cards become three, because three is how many published projects exist.
 * The brief is explicit that the count is not the thing being replicated.
 *
 * The live URL is still the primary action. Today every project is
 * `visibility_mode = 'case_study_only'` with a null `live_url`, so every card
 * points at its case study instead. That is the honest state of the data, not
 * a placeholder: `resolveCardLinks` is wired end to end, and the moment a URL
 * is added through the admin and the mode widened, the card retargets with no
 * code change.
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
      <Section
        id="featured-projects"
        labelledBy="featured-projects-heading"
        chapter="projects"
        className="work-ground"
      >
        <SectionHeading
          id="featured-projects-heading"
          eyebrow="Selected work"
          title="Recent systems"
          tone="inverse"
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
      <Section
        id="featured-projects"
        labelledBy="featured-projects-heading"
        chapter="projects"
        className="work-ground"
      >
        <SectionHeading
          id="featured-projects-heading"
          eyebrow="Selected work"
          title="Recent systems"
          tone="inverse"
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
    <Section
      id="featured-projects"
      labelledBy="featured-projects-heading"
      chapter="projects"
      className="work-ground"
    >
      {/*
       * HEADING LEFT, INTRO RIGHT — the reference's own arrangement. Measured at
       * 1440 its h2 sits at x=302 with a body paragraph in a narrow column at
       * x=1053, top-aligned with the heading rather than stacked under it.
       *
       * `items-start` and not `items-end`: the reference top-aligns the two,
       * which is what lets the paragraph read as an aside to the heading instead
       * of as a caption beneath it.
       */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
        <SectionHeading
          id="featured-projects-heading"
          eyebrow="Selected work"
          title="Systems I've built"
          tone="inverse"
          className="mb-0"
        />

        {/*
         * The reference's intro paragraph. Kept out of SectionHeading's
         * `description` slot on purpose — that slot renders BELOW the rule, and
         * here it belongs beside it.
         */}
        <p className="max-w-[26rem] shrink-0 text-[length:var(--text-base)] leading-[1.5] text-[color:var(--work-ink-dim)] lg:pt-2">
          Each one solved a real operational problem. The problem, the mechanism, and what actually
          changed.
        </p>
      </div>

      {/*
       * THREE CARDS, NOT A PINNED FILMSTRIP — and that is a measurement, not a
       * shortcut.
       *
       * The reference pins this section for 2700px and slides a nine-card track
       * from translateX(-539px) to translateX(-3235px) as you scroll. Both
       * numbers were read off the live site. That mechanism exists because it
       * has nine cards in a 1118px window: 9 x 389 + 8 x 30 = 3741px of track,
       * so there is 2623px of travel to spend the pin on.
       *
       * Three cards at the same 389px are 1207px in a 1200px measure. The
       * travel is ~0px. Pinning 2700px of scroll to move nothing is a defect,
       * not a replication — so the row is static and the cards take the width
       * the reference's proportions give them: (1200 - 2 x 30) / 3 = 380px, at
       * the measured 389/550 ratio. Within 9px of the reference's own card.
       *
       * `work-row` carries the reference's focus behaviour: hovering one card
       * dims the others through the same 60% scrim, at the measured 0.4s.
       *
       * An <ol>, because the 01/02/03 numerals ARE the list position. That is
       * what lets each numeral be `aria-hidden` on the card without losing the
       * ordering for a screen reader.
       */}
      <ol className="work-row mt-10 grid gap-[30px] sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
        {projects.map((project, index) => (
          <li key={project.id} className="min-w-0">
            <WorkCard project={project} index={index} />
          </li>
        ))}
      </ol>

      <div className="mt-10 flex lg:mt-14">
        <Button variant="secondary" shape="pill" asChild className="border-white/30 text-white">
          <Link to="/projects">
            All projects
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
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
