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
      <Section id="about" labelledBy="about-heading">
        <SectionHeading id="about-heading" eyebrow="About" title="Who I am" />
        {/* Skeletons at the final line-height so nothing shifts (12.3). */}
        <div className="measure space-y-2">
          <Skeleton className="h-[1lh] w-full" />
          <Skeleton className="h-[1lh] w-full" />
          <Skeleton className="h-[1lh] w-2/3" />
        </div>
      </Section>
    )
  }

  if (!profile?.shortBio) return null

  return (
    <Section id="about" labelledBy="about-heading">
      <SectionHeading id="about-heading" eyebrow="About" title="Who I am" />

      <div className="measure">
        <p className="text-secondary text-lg leading-[--leading-body]">{profile.shortBio}</p>

        {profile.location && <p className="text-muted mt-4 text-sm">{profile.location}</p>}

        {/* Only offered when /about actually has more to show than this. */}
        {profile.longBioMd && (
          <Link
            to="/about"
            className="text-accent hover:text-accent-strong mt-6 inline-flex items-center gap-1 font-medium"
          >
            Read more
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </Section>
  )
}
