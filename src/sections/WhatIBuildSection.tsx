import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Section, SectionHeading } from '@/components/common/Section'
import { BUILD_TYPES, type BuildType } from '@/content/build-types'
import { useProjects } from '@/hooks/useProjects'
import { cn } from '@/lib/cn'

/**
 * What I Build — PRD 12.4.
 *
 * Translates capability into four concrete build types a business can
 * recognise. Static content (TD-12), but the LINKS are data-driven: a card
 * only links to a filtered project view where published projects in that
 * category actually exist. A link to an empty filtered grid is worse than no
 * link — it reads as a broken site rather than an honest one.
 *
 * With every project currently seeded as draft (Q-06/Q-07), no card renders a
 * link. That is correct.
 */
export function WhatIBuildSection() {
  const { data: projects } = useProjects()

  const populatedCategories = new Set((projects ?? []).map((p) => p.category))

  return (
    <Section id="what-i-build" labelledBy="what-i-build-heading">
      <SectionHeading
        id="what-i-build-heading"
        eyebrow="What I build"
        title="Four kinds of system"
        description="Each one replaces something a person was doing by hand."
      />

      {/*
       * 12.4 — the process-line motif connects the four cards on desktop. It
       * encodes the actual subject matter (workflows and pipelines), so it is
       * structural rather than decorative. `aria-hidden` because it carries no
       * information the text does not.
       */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="via-accent/30 absolute top-0 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent to-transparent xl:block"
        />

        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BUILD_TYPES.map((buildType) => (
            <li key={buildType.category}>
              <BuildTypeCard
                buildType={buildType}
                hasProjects={populatedCategories.has(buildType.category)}
              />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

function BuildTypeCard({ buildType, hasProjects }: { buildType: BuildType; hasProjects: boolean }) {
  return (
    <article
      className={cn(
        'rim-light border-subtle bg-surface hover:border-accent/40 transition-colors duration-[--duration-hover] ease-[--ease-out] flex h-full flex-col rounded-[--radius-lg] border p-5',
        'transition-colors duration-[--duration-hover] ease-[--ease-out]',
        'hover:border-strong',
      )}
    >
      {/* The node marker on the process line. */}
      <span
        aria-hidden="true"
        className="bg-accent ring-base mb-4 block size-2 rounded-full ring-4"
      />

      <h3 className="text-primary text-lg">{buildType.title}</h3>
      <p className="text-secondary mt-2 text-sm">{buildType.description}</p>

      <ul className="mt-4 space-y-1.5">
        {buildType.bullets.map((bullet) => (
          <li key={bullet} className="text-muted flex gap-2 text-sm">
            <span aria-hidden="true" className="text-accent">
              ·
            </span>
            {bullet}
          </li>
        ))}
      </ul>

      {/*
       * 12.4 accessibility note: the CARD is not a link. The link inside it is
       * the interactive element, and it carries a descriptive label — four
       * cards all named "View projects" would be useless in a link list.
       */}
      {hasProjects && (
        <Link
          to={`/projects?category=${buildType.category}`}
          className="text-accent hover:text-accent-strong mt-5 inline-flex items-center gap-1 text-sm font-medium"
        >
          View {buildType.title.toLowerCase()} projects
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </article>
  )
}
