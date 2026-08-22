import { lazy, Suspense } from 'react'

import { SEO } from '@/components/common/SEO'
import { SceneContainer } from '@/components/three/SceneContainer'
import { AboutSection } from '@/sections/AboutSection'
import { CapabilitiesSection } from '@/sections/CapabilitiesSection'
import { ContactCtaSection } from '@/sections/ContactCtaSection'
import { EducationSection } from '@/sections/EducationSection'
import { ExperienceSection } from '@/sections/ExperienceSection'
import { FeaturedProjectsSection } from '@/sections/FeaturedProjectsSection'
import { HeroSection } from '@/sections/HeroSection'
import { ImpactSection } from '@/sections/ImpactSection'
import { IntroductionSection } from '@/sections/IntroductionSection'
import { ProcessSection } from '@/sections/ProcessSection'
import { SkillsSection } from '@/sections/SkillsSection'
import { useReducedMotion } from '@/hooks/useMediaQuery'
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
/**
 * Phase 4's DOM choreography — lazy, and homepage-only.
 *
 * Lazy for the same reason the scene is: GSAP plus ScrollTrigger is real weight
 * and no other route animates anything, so a static import would put it in the
 * shared shell and charge /resume for it. The shell budget in verify:ui is what
 * proves it stayed out.
 */
const ScrollChoreography = lazy(() => import('@/components/motion/ScrollChoreography'))

export default function HomePage() {
  /*
   * A11Y-10 / motion spec section 7 — the guard is here rather than inside the
   * component so that under `prefers-reduced-motion` the module is never even
   * fetched. Content then renders at its natural final state, because nothing
   * ever set it to `opacity: 0`.
   */
  const reducedMotion = useReducedMotion()
  const { data: profile } = useProfile()
  const { data: settings } = useSettings()

  // SEO-04 resolution order for the homepage: the profile's own OG image, then
  // the site default. A project page adds its cover ahead of both.
  const ogImage =
    publicStorageUrl('profile', profile?.ogImagePath ?? null) ??
    publicStorageUrl('profile', settings?.defaultOgImagePath ?? null)

  return (
    <>
      <SceneContainer />

      {!reducedMotion && (
        <Suspense fallback={null}>
          <ScrollChoreography />
        </Suspense>
      )}

      <SEO
        title={pageTitle()}
        description={settings?.siteDescription ?? profile?.positioningLine}
        image={ogImage}
        canonicalPath="/"
        type="profile"
      />

      {/*
       * The seven-chapter narrative, spec §2. Order is the narrative:
       * entry → introduction → capabilities → projects → process → about →
       * contact. Chapters 02 and 05 are new; the rest already existed and are
       * reused rather than rebuilt.
       */}
      <HeroSection />
      <IntroductionSection />
      <CapabilitiesSection />
      <FeaturedProjectsSection />
      <ProcessSection />
      <AboutSection />

      {/*
       * Not chapters, and kept deliberately.
       *
       * Impact, Experience, Skills and Education are not part of the seven-act
       * structure, but they are published content — Education in particular is
       * asserted by a passing check — and dropping them to fit a narrative
       * would silently delete work. They sit after the narrative and before the
       * closing CTA, where they read as an appendix rather than an interruption.
       *
       * Flagged for the Phase 1 review: Experience and Skills also have their
       * own routes, so they could move there entirely. Education has no route
       * and would need one first.
       */}
      <ImpactSection />
      <ExperienceSection variant="summary" />
      <SkillsSection />
      <EducationSection />

      <ContactCtaSection />
    </>
  )
}
