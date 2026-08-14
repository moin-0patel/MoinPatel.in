import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/ui/Badge'
import { GithubIcon } from '@/components/ui/BrandIcon'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { cn } from '@/lib/cn'
import { imageSizes, publicStorageUrl } from '@/lib/storage'
import { resolveCardLinks } from '@/lib/visibility'
import type { ProjectCategory, ProjectSummary } from '@/types/domain'

/**
 * ProjectCard — PRD 13.2.
 *
 * The whole card is one link; the GitHub/live icons inside are separate links
 * that stop propagation. Where the card points is decided entirely by
 * `resolveCardLinks` (lib/visibility.ts), which is table-driven over all five
 * visibility modes and unit-tested — this component never branches on
 * `visibility_mode` itself.
 */

const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  ai_automation: 'AI Automation',
  web_application: 'Web Application',
  business_process_automation: 'Business Process Automation',
  data_reporting: 'Data & Reporting',
  other: 'Other',
}

/** 13.2 — up to 4 chips, then a "+N" overflow. */
const MAX_VISIBLE_TECH = 4

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const { target, showGithubIcon, showLiveIcon } = resolveCardLinks(project)
  const coverUrl = publicStorageUrl('projects', project.coverImagePath)
  const visibleTech = project.technologies.slice(0, MAX_VISIBLE_TECH)
  const overflow = project.technologies.length - visibleTech.length

  const cardBody = (
    <>
      <div className="bg-surface-raised relative aspect-video overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            // The database guarantees alt text exists whenever a cover does
            // (projects_cover_alt_check), so this fallback is belt and braces.
            alt={project.coverImageAlt ?? project.title}
            loading="lazy"
            decoding="async"
            sizes={imageSizes('card')}
            className={cn(
              'size-full object-cover',
              'transition-transform duration-[--duration-hover] ease-[--ease-out]',
              'group-hover:scale-[1.02] motion-reduce:transform-none',
            )}
          />
        ) : (
          // PRD 38 — "Missing image: fallback gradient tile with the project
          // title; never a broken-image icon."
          <div
            aria-hidden="true"
            className="from-surface-raised to-indigo-deep/40 grid size-full place-items-center bg-gradient-to-br"
          >
            <span className="text-muted px-4 text-center font-mono text-xs">{project.title}</span>
          </div>
        )}

        {/* FR-PROJ-08 — status badge, top-left over the image, always as text. */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={project.status} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-muted font-mono text-xs tracking-[--tracking-mono]">
          {CATEGORY_LABEL[project.category]}
        </p>

        <h3 className="text-primary group-hover:text-accent transition-colors duration-[--duration-hover]">
          {project.title}
        </h3>

        {/* Clamped to 2 lines on desktop, 3 on mobile (13.2). */}
        <p className="text-secondary line-clamp-3 text-sm md:line-clamp-2">{project.summary}</p>

        {project.technologies.length > 0 && (
          <ChipRow className="mt-auto pt-1">
            {visibleTech.map((tech) => (
              <Chip key={tech.id}>{tech.name}</Chip>
            ))}
            {overflow > 0 && <Chip>{`+${overflow}`}</Chip>}
          </ChipRow>
        )}
      </div>
    </>
  )

  const cardClass = cn(
    'group border-subtle bg-surface relative flex flex-col overflow-hidden',
    'rounded-[--radius-lg] border',
    'transition-colors duration-[--duration-hover] ease-[--ease-out]',
    'hover:border-strong hover:shadow-[--shadow-raised]',
    // A11Y-04 — the ring is on the card itself, not just the inner text.
    'focus-within:outline-focus-ring focus-within:outline-2 focus-within:outline-offset-2',
  )

  /*
   * `visibility_mode = 'private'` yields target.kind === 'none'. RLS should
   * have withheld the row entirely, so reaching here means something upstream
   * is wrong — render the card inert rather than linking nowhere.
   */
  if (target.kind === 'none') {
    return <article className={cardClass}>{cardBody}</article>
  }

  return (
    <article className={cardClass}>
      {target.kind === 'case-study' ? (
        // The stretched-link pattern: one real <a> covering the card, so the
        // accessible name is the title alone rather than every word inside it.
        <Link to={target.href} className="contents">
          <span className="absolute inset-0 z-10" aria-hidden="true" />
          <span className="visually-hidden">{project.title}</span>
          {cardBody}
        </Link>
      ) : (
        <a
          href={target.href}
          target="_blank"
          rel="noopener noreferrer" // FR-NAV-06
          className="contents"
        >
          <span className="absolute inset-0 z-10" aria-hidden="true" />
          <span className="visually-hidden">{project.title} (opens in a new tab)</span>
          {cardBody}
        </a>
      )}

      {(showGithubIcon || showLiveIcon) && (
        <div className="absolute top-3 right-3 z-20 flex gap-1.5">
          {showGithubIcon && project.githubUrl && (
            <IconLink href={project.githubUrl} label={`${project.title} on GitHub`}>
              <GithubIcon className="size-4" />
            </IconLink>
          )}
          {showLiveIcon && project.liveUrl && (
            <IconLink href={project.liveUrl} label={`${project.title} live demo`}>
              <ExternalLink className="size-4" aria-hidden="true" />
            </IconLink>
          )}
        </div>
      )}
    </article>
  )
}

/** 13.2 — icon links inside the card stop propagation and label themselves. */
function IconLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'grid size-9 place-items-center rounded-[--radius-sm]',
        'border-subtle bg-base/80 text-secondary border backdrop-blur-sm',
        'transition-colors duration-[--duration-hover] ease-[--ease-out]',
        'hover:text-primary hover:border-strong',
      )}
    >
      {children}
    </a>
  )
}
