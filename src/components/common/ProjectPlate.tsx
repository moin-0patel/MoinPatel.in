import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/ui/Badge'
import { GithubIcon } from '@/components/ui/BrandIcon'
import { Chip } from '@/components/ui/Chip'
import { PROJECT_CLAIMS } from '@/content/project-claims'
import { cn } from '@/lib/cn'
import { CATEGORY_LABEL } from '@/lib/labels'
import { imageSizes, publicStorageUrl } from '@/lib/storage'
import { caseStudyPath, resolveCardLinks } from '@/lib/visibility'
import type { ProjectSummary } from '@/types/domain'

/**
 * A project as an editorial plate — the homepage's Selected Systems showcase.
 *
 * WHY THIS EXISTS ALONGSIDE ProjectCard
 *
 * `ProjectCard` is the index page's unit: a compact tile that has to tessellate
 * in a three-column grid and read at 300px wide. This is the opposite problem —
 * one project occupying a full-width composition, where the job is to make the
 * work feel like a product rather than a thumbnail. Reworking the card to do
 * both would have made it worse at each, and `/projects` depends on it.
 *
 * WHAT IT DOES NOT DO
 *
 * It never invents a preview. No project currently has a cover image, so the
 * composition is built to read from type, numbering, metadata and the verified
 * claim band alone; when `coverImagePath` arrives the plate uses it and looks
 * better for it. A layout that only works once someone supplies screenshots is
 * a layout that does not work.
 *
 * LINKS
 *
 * The live URL is the primary action when there is one. What "when there is
 * one" means is not this component's decision — `resolveCardLinks` owns it,
 * because `visibility_mode` can suppress a link that exists (a project can have
 * a URL that is deliberately not advertised). Asking the policy rather than the
 * data is what keeps that intent from being quietly overridden here.
 */

/** Zero-padded, so the index column stays optically even past nine. */
const indexLabel = (index: number) => String(index + 1).padStart(2, '0')

export function ProjectPlate({ project, index }: { project: ProjectSummary; index: number }) {
  const { showGithubIcon, showLiveIcon } = resolveCardLinks(project)
  const coverUrl = publicStorageUrl('projects', project.coverImagePath)
  const claims = PROJECT_CLAIMS[project.slug] ?? []
  const liveHref = showLiveIcon ? project.liveUrl : null

  /*
   * MOBILE IS CONTAINED, DESKTOP IS OPEN — deliberate responsive art
   * direction, not a fallback.
   *
   * Below `lg` the plate sits on an opaque surface; above it the surface
   * disappears and the composition breathes against the page. The reason is
   * measured: during chapter 04 the Core's silhouette is roughly 404px wide, so
   * on a 390px viewport there is no screen position where it clears this prose
   * — the summary measured 1.66:1 against a 4.5:1 requirement. Desktop has room
   * either side and the framing search finds it, so desktop keeps the open
   * composition.
   *
   * The old card grid passed contrast here only because every project sat on an
   * opaque tile. Removing the tile is what made this section editorial; keeping
   * one at the width where the scene cannot be avoided is what keeps it
   * readable.
   */
  return (
    <article
      className={cn(
        'group border-subtle relative border-t pt-[--section-gap]',
        'bg-surface -mx-[--gutter] px-[--gutter] pb-[--section-gap]',
        'lg:bg-transparent lg:mx-0 lg:px-0 lg:pb-0',
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-10">
        {/*
         * The index numeral. Decorative: the ordered list already conveys
         * position to a screen reader, and hearing "zero two" before every
         * project title is noise.
         */}
        <p
          aria-hidden="true"
          className="text-muted font-mono text-[length:var(--text-2xl)] leading-none tracking-[--tracking-mono] tabular-nums lg:text-[length:var(--text-4xl)]"
        >
          {indexLabel(index)}
        </p>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-accent font-mono text-xs tracking-[--tracking-mono] uppercase">
              {CATEGORY_LABEL[project.category]}
            </p>
            <StatusBadge status={project.status} />
          </div>

          {/*
           * The title is the only wrapping link, with a pseudo-element covering
           * the plate — the stretched-link pattern. The action row below sits
           * above it on the z-axis, so those links stay independently
           * clickable. Nesting them inside the title's anchor would be invalid
           * HTML and would strand them for keyboard users.
           */}
          {/*
           * THE TITLE LANE — measured, not stylistic.
           *
           * At display scale a long project title reaches the right edge, and
           * during the projects chapter that leaves the Core's framing search
           * no clear region: a technology chip measured 1.31:1 against the lit
           * sphere (#b1a5e4) at 1280x900.
           *
           * Capping the measure hands roughly a third of the frame back as
           * deliberate negative space, which is where the Core then sits. It is
           * composition rather than a scrim, a panel, or a dimmed Core.
           */}
          <h3 className="text-primary font-display mt-3 text-[length:var(--text-3xl)] leading-[--leading-snug] font-semibold tracking-[--tracking-tight] text-balance lg:max-w-[16ch] lg:text-[length:var(--text-5xl)]">
            <Link
              to={caseStudyPath(project.slug)}
              className="after:absolute after:inset-0 after:content-[''] hover:text-accent focus-visible:text-accent transition-colors duration-[--duration-hover] ease-[--ease-out]"
            >
              {project.title}
            </Link>
          </h3>

          {/*
           * 46ch rather than `measure` (72ch). `measure` is FR-CASE-10's width
           * for case-study copy with nothing rendered behind it; this sits over
           * the scene, and full-width prose leaves the framing search nowhere
           * to move to.
           */}
          <p className="text-secondary mt-4 max-w-[46ch] text-[length:var(--text-lg)]">
            {project.summary}
          </p>

          {/*
           * The verified claim band. Structural facts checkable against the
           * repository, never metrics — the invented percentages from the
           * original mockup are not coming back. A project with no entry
           * renders no band; silence is correct when there is nothing
           * verifiable to say.
           */}
          {/*
           * The spec panel — claims and technology on a real opaque surface.
           *
           * Not decoration and not a card for its own sake. This is the densest
           * small text on the plate, and at 390px the Core's silhouette is
           * wider than the viewport, so there is no screen position where it
           * clears these lines: measured at 1.09:1 against a 4.5:1 requirement
           * before this panel existed. An opaque surface fixes it the same way
           * the capability cards already do — the text composites against the
           * surface rather than against the scene, so the contrast is real
           * rather than argued.
           *
           * It also earns its place editorially: claims and stack are
           * reference material, distinct from the prose above them, and giving
           * them one plane says so.
           */}
          {(claims.length > 0 || project.technologies.length > 0) && (
            <div className="border-subtle bg-surface mt-6 border p-5 lg:max-w-[44rem]">
              {claims.length > 0 && (
                <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                  {claims.map((claim) => (
                    <li key={claim.label} className="min-w-0">
                      <p className="text-primary font-mono text-xs tracking-[--tracking-mono] uppercase">
                        {claim.label}
                      </p>
                      <p className="text-secondary mt-1 text-sm">{claim.detail}</p>
                    </li>
                  ))}
                </ul>
              )}

              {project.technologies.length > 0 && (
                <ul
                  className={cn(
                    'flex flex-wrap gap-2',
                    claims.length > 0 && 'border-subtle mt-5 border-t pt-5',
                  )}
                >
                  {project.technologies.slice(0, 6).map((tech) => (
                    <li key={tech.id}>
                      <Chip>{tech.name}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* z-20 lifts the whole row above the title's stretched hit area. */}
          <div className="relative z-20 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {liveHref ? (
              <a
                href={liveHref}
                target="_blank"
                rel="noopener noreferrer" // FR-NAV-06
                className={cn(
                  'text-primary hover:text-accent focus-visible:text-accent',
                  'font-display inline-flex items-center gap-2 text-[length:var(--text-lg)] font-medium',
                  'transition-colors duration-[--duration-hover] ease-[--ease-out]',
                )}
              >
                View live
                <ArrowUpRight
                  className="size-5 transition-transform duration-[--duration-hover] ease-[--ease-out] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
                  aria-hidden="true"
                />
                <span className="visually-hidden">— {project.title} (opens in a new tab)</span>
              </a>
            ) : (
              /*
               * No live URL. Deliberately NOT a disabled button and not a dead
               * link: it states what is true — this project is documented
               * rather than deployable — and stays out of the tab order,
               * because a control that cannot be operated should not be
               * reachable as though it can.
               */
              <p className="text-muted font-mono text-xs tracking-[--tracking-mono] uppercase">
                {project.status === 'in_progress' ? 'Live demo coming soon' : 'Case study only'}
              </p>
            )}

            <Link
              to={caseStudyPath(project.slug)}
              className="text-secondary hover:text-primary focus-visible:text-primary text-sm transition-colors duration-[--duration-hover] ease-[--ease-out]"
            >
              Read the case study
              <span className="visually-hidden"> — {project.title}</span>
            </Link>

            {showGithubIcon && project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-primary focus-visible:text-primary inline-flex items-center gap-2 text-sm transition-colors duration-[--duration-hover] ease-[--ease-out]"
              >
                <GithubIcon className="size-4" aria-hidden="true" />
                Source
                <span className="visually-hidden">
                  — {project.title} on GitHub (opens in a new tab)
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/*
       * The cover, when one exists. Last in the DOM and hidden below `lg` on
       * purpose: it is supporting evidence, not the argument, and on a phone it
       * would push the actions below the fold.
       */}
      {coverUrl && (
        <div className="border-subtle mt-8 hidden overflow-hidden border lg:block">
          <img
            src={coverUrl}
            alt={project.coverImageAlt ?? project.title}
            loading="lazy"
            decoding="async"
            sizes={imageSizes('card')}
            className="aspect-[16/7] w-full object-cover transition-transform duration-[--duration-entry] ease-[--ease-out] group-hover:scale-[1.01] motion-reduce:transform-none"
          />
        </div>
      )}
    </article>
  )
}
