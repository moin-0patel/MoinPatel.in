import { SEO } from '@/components/common/SEO'
import { SkillsSection } from '@/sections/SkillsSection'
import { pageTitle } from '@/lib/seo'

/**
 * /skills — PRD 16, FR-SKILL-02.
 *
 * FR-SKILL-03 restated because it is the requirement most likely to be
 * "improved" later: no percentages, no bars, no star ratings. There is no
 * proficiency column in the schema to render one from, and AC-SKILL-3 asserts
 * that absence in `npm run db:verify`.
 */
export default function SkillsPage() {
  return (
    <>
      <SEO
        title={pageTitle('Skills')}
        description="Programming, AI and automation, and business tools — the capabilities behind Moin Patel's projects."
        canonicalPath="/skills"
      />
      <div className="container-page pt-12 md:pt-20">
        <h1 className="text-primary">Skills</h1>
        <p className="text-secondary measure mt-4">
          Grouped by category. Ordering and emphasis reflect what gets used most, not a
          self-assessed score.
        </p>
      </div>
      <SkillsSection />
    </>
  )
}
