import { Link } from 'react-router-dom'

import { Chapter, ChapterNumber } from '@/components/common/Chapter'
import { SectionHeading } from '@/components/common/Section'
import { Card } from '@/components/ui/Card'
import { CAPABILITIES, type Capability } from '@/content/capabilities'
import { useProjects } from '@/hooks/useProjects'

/**
 * Chapter 03 — Capabilities, spec §9.
 *
 * The four areas the spec names: AI, AUTOMATION, DATA, SYSTEMS.
 *
 * Replaces `WhatIBuildSection` in the narrative. That section answered a
 * similar question ("four kinds of system") but was organised around project
 * categories rather than capabilities, and running both would say the same
 * thing twice in one scroll. Its process-line motif and card treatment carry
 * over; what changes is the framing.
 *
 * PHASE 1 SCOPE. Spec §9 asks that these "reveal progressively" rather than all
 * at once — that is Phase 4's scrubbed timeline. Here all four are present and
 * readable. `data-capability` is the hook Phase 4 will stagger against,
 * established now so that phase adds only animation.
 *
 * The live link is real: a capability whose category has published projects
 * links into the filtered project list, so a claim is one click from its
 * evidence. Categories with nothing published render as plain text — no dead
 * link, and no implication of work that is not there.
 */
export function CapabilitiesSection() {
  const { data: projects } = useProjects()
  const populated = new Set((projects ?? []).map((project) => project.category))

  return (
    <Chapter id="capabilities" labelledBy="capabilities-heading">
      <div className="flex items-start gap-4 md:gap-8">
        <ChapterNumber id="capabilities" className="mt-2 shrink-0" />

        <div className="min-w-0 flex-1">
          <SectionHeading
            id="capabilities-heading"
            // The reference's single oversized section heading (measured 180px
            // against 66px elsewhere). This is the equivalent slot.
            scale="display"
            eyebrow="Capabilities"
            meta="CORE_SYSTEMS"
            title="What I work on"
            description="Four areas that show up in every system I build, usually all at once."
          />

          {/*
           * The process-line motif from the section this replaces: it encodes
           * the subject matter (pipelines), so it is structural rather than
           * ornament. aria-hidden — it carries nothing the text does not.
           */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="via-accent/30 absolute top-0 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent to-transparent xl:block"
            />

            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {CAPABILITIES.map((capability, index) => (
                <li key={capability.title} data-capability={index} className="flex min-w-0">
                  <CapabilityCard
                    capability={capability}
                    hasProjects={capability.category !== null && populated.has(capability.category)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Chapter>
  )
}

function CapabilityCard({
  capability,
  hasProjects,
}: {
  capability: Capability
  hasProjects: boolean
}) {
  return (
    <Card as="article" interactive className="flex h-full min-w-0 flex-col">
      <p className="text-accent font-mono text-xs tracking-[--tracking-mono] uppercase">
        {capability.eyebrow}
      </p>

      {/* A11Y-02 — h3 under the chapter's h2; levels never skip. */}
      <h3 className="text-primary mt-2 text-lg font-semibold">{capability.title}</h3>

      <p className="text-secondary mt-2 text-sm">{capability.description}</p>

      <ul className="mt-4 space-y-1.5">
        {capability.items.map((item) => (
          <li key={item} className="text-muted flex gap-2 text-sm">
            <span aria-hidden="true" className="text-accent/60">
              ·
            </span>
            {item}
          </li>
        ))}
      </ul>

      {hasProjects && capability.category && (
        <Link
          to={`/projects?category=${capability.category}`}
          className="text-accent hover:text-primary mt-4 inline-flex text-sm font-medium"
        >
          See it built
          <span className="visually-hidden"> — {capability.title} projects</span>
        </Link>
      )}
    </Card>
  )
}
