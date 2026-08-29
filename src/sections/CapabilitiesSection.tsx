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
          />

          {/*
           * THE STATEMENT — the reference's "What You Get?" moment, measured
           * live: after its 180px/700 heading it sets one large line at
           * 67.97px/700, solid line-height, in an 896px column, and that pair
           * IS the section — the capability names float around it as pills
           * with no detail behind them.
           *
           * The sentence is the section's existing approved description,
           * promoted from the small under-rule slot to the statement scale.
           * It steps to --text-5xl rather than the measured 68px-at-1440
           * because our display heading above is capped at --text-7xl (its
           * 180px wraps our longer words); the reference's statement matches
           * its SECTION-HEADING scale, and --text-5xl is exactly ours.
           *
           * Left-aligned, not centered: the reference centers this whole
           * section while every other of its sections is left-set. Ours holds
           * the site-wide left axis — one alignment grammar, already locked.
           */}
          <p className="font-display max-w-[56rem] text-[length:var(--text-3xl)] leading-[1.02] font-bold text-balance md:text-[length:var(--text-4xl)] lg:text-[length:var(--text-5xl)]">
            Four areas that show up in every system I build, usually all at once.
          </p>

          {/*
           * THE CARDS — the reference's SERVICE-card anatomy, from its
           * "Solutions That Deliver" section, measured live:
           *
           *   card     358 wide, bg rgb(206,205,187), radius 8.06px — which is
           *            exactly our --radius-lg and close to --color-surface
           *   title    22.03px/500
           *   body     16.99px/400
           *   items    a dotted list, each led by a small accent RING
           *   footer   a closing line, and a price-or-CTA slot
           *
           * TWO REFERENCE SECTIONS, ONE OF OURS — deliberate. The reference
           * splits "What You Get?" (statement + title pills, no detail) from
           * "Services" (detail columns with prices). Both draw on one idea:
           * what working with him gets you. Our equivalent is one verified
           * dataset — these four capabilities — so the statement above takes
           * the first section's job and these cards take the second's.
           * Floating title pills AND detail cards would say every capability
           * twice in one screen.
           *
           * WHAT THE PRICE SLOT HOLDS: nothing. The reference prices two of
           * its three cards ($3,000, $5,000) and its own third card puts
           * "Book a Call" where the price goes. There is no verified pricing
           * data, so no number is shown; the card's action slot carries the
           * real evidence link instead — "See it built", straight into the
           * filtered project list, which is a stronger claim than a figure.
           */}
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:mt-14 xl:grid-cols-4">
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
    <Card as="article" interactive className="flex h-full min-w-0 flex-col px-5 py-6">
      <p className="text-accent font-mono text-xs tracking-(--tracking-mono) uppercase">
        {capability.eyebrow}
      </p>

      {/* A11Y-02 — h3 under the chapter's h2; levels never skip. */}
      {/* 22.03px/500 measured on the reference's service-card title. */}
      <h3 className="text-primary font-display mt-2 text-[length:var(--text-xl)] font-medium">
        {capability.title}
      </h3>

      <p className="text-secondary mt-3 text-sm leading-[1.5]">{capability.description}</p>

      <ul className="mt-5 space-y-2">
        {capability.items.map((item) => (
          <li key={item} className="text-secondary flex gap-2.5 text-sm">
            {/*
             * The reference's list marker: a small open RING, its accent on
             * cream. Cyan for yellow, as everywhere. Decorative.
             */}
            <span
              aria-hidden="true"
              className="border-accent mt-1.5 size-2 shrink-0 rounded-full border"
            />
            {item}
          </li>
        ))}
      </ul>

      {hasProjects && capability.category && (
        <Link
          to={`/projects?category=${capability.category}`}
          className="text-accent hover:text-primary mt-auto inline-flex pt-5 text-sm font-medium transition-colors duration-(--duration-hover) ease-(--ease-reference)"
        >
          See it built
          <span className="visually-hidden"> — {capability.title} projects</span>
        </Link>
      )}
    </Card>
  )
}
