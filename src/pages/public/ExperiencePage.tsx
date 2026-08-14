import { SEO } from '@/components/common/SEO'
import { ExperienceSection } from '@/sections/ExperienceSection'
import { pageTitle } from '@/lib/seo'

/**
 * /experience — PRD 15, FR-EXP-01.
 *
 * The full timeline. Reuses ExperienceSection in its `full` variant rather
 * than duplicating the timeline markup: FR-EXP-02/03/05 are identical
 * requirements on both surfaces, and two copies would drift.
 */
export default function ExperiencePage() {
  return (
    <>
      <SEO
        title={pageTitle('Experience')}
        description="Roles, responsibilities and the tools used in each — Moin Patel's professional experience."
        canonicalPath="/experience"
      />
      <div className="container-page pt-12 md:pt-20">
        <h1 className="text-primary">Experience</h1>
      </div>
      <ExperienceSection variant="full" />
    </>
  )
}
