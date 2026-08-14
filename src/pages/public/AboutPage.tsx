import { Prose } from '@/components/common/Prose'
import { SEO } from '@/components/common/SEO'
import { EmptyState } from '@/components/common/States'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { EducationSection } from '@/sections/EducationSection'
import { useProfile } from '@/hooks/useSiteContent'
import { pageTitle } from '@/lib/seo'
import { publicStorageUrl } from '@/lib/storage'

/**
 * /about — PRD 9.1, 12.3.
 *
 * The full narrative bio plus education. Education has no public route of its
 * own by design (9.2): it is a short block, and a dedicated page would be a
 * near-empty page and a weak SEO target.
 *
 * Q-12 is unanswered, so `long_bio_md` is null and this page currently shows
 * an honest empty state rather than invented prose. The PRD is explicit that
 * this project will not write Moin's biography for him, and a plausible-sounding
 * fake bio is the kind of thing that ships and never gets replaced.
 */
export default function AboutPage() {
  const { data: profile, isPending } = useProfile()

  const avatarUrl = publicStorageUrl('profile', profile?.avatarPath ?? null)

  return (
    <>
      <SEO
        title={pageTitle('About')}
        description={
          profile?.shortBio ??
          'AI Developer and AI Automation Executive in Surat, building systems that replace manual business processes.'
        }
        canonicalPath="/about"
      />

      <div className="container-page py-12 md:py-20">
        <h1 className="text-primary">About</h1>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_280px] lg:gap-16">
          <div className="min-w-0">
            {isPending ? (
              <div className="measure space-y-3">
                <SkeletonText lines={6} />
              </div>
            ) : profile?.longBioMd ? (
              <Prose markdown={profile.longBioMd} />
            ) : profile?.shortBio ? (
              <p className="text-secondary measure text-lg">{profile.shortBio}</p>
            ) : (
              <EmptyState
                title="This section is being written"
                description="The full bio is on its way. In the meantime, the projects say more than a paragraph would."
              />
            )}
          </div>

          {isPending ? (
            <Skeleton className="aspect-square w-full rounded-[--radius-xl] lg:w-[280px]" />
          ) : (
            avatarUrl && (
              <img
                src={avatarUrl}
                alt={profile?.avatarAlt ?? profile?.fullName ?? 'Moin Patel'}
                loading="lazy"
                decoding="async"
                className="ring-accent/20 aspect-square w-full rounded-[--radius-xl] object-cover ring-2 ring-offset-4 ring-offset-[--color-base] lg:w-[280px]"
              />
            )
          )}
        </div>
      </div>

      <EducationSection />
    </>
  )
}
