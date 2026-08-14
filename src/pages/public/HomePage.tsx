import { SEO } from '@/components/common/SEO'
import { AboutSection } from '@/sections/AboutSection'
import { ContactCtaSection } from '@/sections/ContactCtaSection'
import { EducationSection } from '@/sections/EducationSection'
import { ExperienceSection } from '@/sections/ExperienceSection'
import { FeaturedProjectsSection } from '@/sections/FeaturedProjectsSection'
import { HeroSection } from '@/sections/HeroSection'
import { ImpactSection } from '@/sections/ImpactSection'
import { SkillsSection } from '@/sections/SkillsSection'
import { WhatIBuildSection } from '@/sections/WhatIBuildSection'
import { useProfile, useSettings } from '@/hooks/useSiteContent'
import { publicStorageUrl } from '@/lib/storage'
import { pageTitle } from '@/lib/seo'

/**
 * Home — PRD Section 12.
 *
 * Sections render in the documented order and are individually addressable by
 * anchor id. Each fetches through its own hook and is wrapped in its own error
 * boundary (inside <Section>), so a failure in one renders that section's
 * error state and never blanks the page.
 *
 * Navigation and Footer are sections 1 and 11 in the PRD's numbering; they
 * live in PublicLayout because every public route needs them.
 *
 * Several sections currently render nothing, and that is the specified
 * behaviour rather than a gap: About hides without a bio (Q-12), Featured
 * Projects hides with no published project (Q-06/Q-07), and Education shows
 * only the one published record. The page reads as complete at every content
 * level — which is exactly what "empty-state safe" in the Phase 8 exit
 * criteria means.
 */
export default function HomePage() {
  const { data: profile } = useProfile()
  const { data: settings } = useSettings()

  // SEO-04 resolution order for the homepage: the profile's own OG image, then
  // the site default. A project page adds its cover ahead of both.
  const ogImage =
    publicStorageUrl('profile', profile?.ogImagePath ?? null) ??
    publicStorageUrl('profile', settings?.defaultOgImagePath ?? null)

  return (
    <>
      <SEO
        title={pageTitle()}
        description={settings?.siteDescription ?? profile?.positioningLine}
        image={ogImage}
        canonicalPath="/"
        type="profile"
      />

      <HeroSection />
      <AboutSection />
      <WhatIBuildSection />
      <ImpactSection />
      <FeaturedProjectsSection />
      <ExperienceSection variant="summary" />
      <SkillsSection />
      <EducationSection />
      <ContactCtaSection />
    </>
  )
}
