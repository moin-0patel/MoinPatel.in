import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Section, SectionHeading } from '@/components/common/Section'
import { Skeleton } from '@/components/ui/Skeleton'
import { useProfile } from '@/hooks/useSiteContent'

/**
 * About (summary) — PRD 12.3.
 *
 * Establishes the business + technology combination in about eighty words.
 *
 * 12.3 "Empty": if `short_bio` is null the section is NOT RENDERED AT ALL —
 * no placeholder text. That is the live state today: Q-12 asks Moin for a
 * 60–80 word short bio and a 200–300 word long bio in his own words, and the
 * PRD is explicit that this project will not write his biography for him.
 *
 * So this section is currently invisible, by design and not by accident. It
 * appears the moment the copy exists, with no code change.
 */
export function AboutSection() {
  const { data: profile, isPending } = useProfile()

  if (isPending) {
    return (
      <Section id="about" labelledBy="about-heading" chapter="about">
        <SectionHeading id="about-heading" eyebrow="About" meta="SYS_PROFILE" title="About me" />
        {/* Skeletons at the final line-height so nothing shifts (12.3). */}
        <div className="max-w-[24rem] space-y-2">
          <Skeleton className="h-[1lh] w-full" />
          <Skeleton className="h-[1lh] w-full" />
          <Skeleton className="h-[1lh] w-2/3" />
        </div>
      </Section>
    )
  }

  if (!profile?.shortBio) return null

  return (
    <Section id="about" labelledBy="about-heading" chapter="about">
      <SectionHeading id="about-heading" eyebrow="About" meta="SYS_PROFILE" title="About me" />

      {/*
       * A NARROW column, measured off the reference rather than our own 72ch
       * habit. Its About intro sets a 16.99px paragraph in a 389px column
       * directly under the 65.95px heading — the narrowness against the wide
       * heading is the editorial gesture. `measure` (72ch ~ 700px) flattened
       * that into an ordinary text block.
       */}
      <div className="max-w-[24rem]">
        <p className="text-secondary text-lg leading-(--leading-body)">{profile.shortBio}</p>

        {profile.location && <p className="text-muted mt-4 text-sm">{profile.location}</p>}

        {/*
         * Only offered when /about actually has more to show than this.
         *
         * HOVER DARKENS, and that was a real defect rather than a preference.
         * It used to be `hover:text-accent-strong` (#00a8b8), which was correct
         * on the old near-black ground: pointing at a link lit it up. On cream
         * the same move runs the wrong way — measured, the link went from
         * 6.37:1 at rest to 1.85:1 on hover, so it very nearly disappeared at
         * exactly the moment someone was trying to click it.
         *
         * Nothing in the bright half of the accent ramp can be the answer:
         * accent-deep is 2.55:1 and accent-fill 1.40:1 on this ground. Those
         * are FILL tones that carry dark ink on top, never type. So the hover
         * goes to `--color-primary` at 13.50:1 — on a light ground, emphasis is
         * darker, not brighter.
         */}
        {profile.longBioMd && (
          <Link
            to="/about"
            className="text-accent hover:text-primary mt-6 inline-flex items-center gap-1 font-medium transition-colors duration-(--duration-hover) ease-(--ease-reference)"
          >
            Read more
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </Section>
  )
}
