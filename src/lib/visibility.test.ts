import { describe, expect, it } from 'vitest'

import { hasCaseStudyPage, resolveCardLinks, serviceTypeForCategory } from './visibility'
import type { ProjectCategory, VisibilityMode } from '@/types/domain'

/**
 * Visibility resolution — PRD 41.1:
 *
 *   "Visibility resolution — given publication_state + visibility_mode, what
 *    does a card link to and which icons render? (Table-driven across all
 *    combinations.)"
 *
 * AC-PROJ-11 requires all five modes to behave correctly. This is the exact
 * kind of logic that silently degrades: nobody notices that `github_only`
 * quietly started linking to the case study until a private repo is exposed
 * or a confidential write-up is reachable.
 */

const base = {
  slug: 'example-project',
  githubUrl: 'https://github.com/example/repo',
  liveUrl: 'https://example.com',
}

type Expected = {
  targetKind: 'case-study' | 'external' | 'none'
  targetHref?: string
  github: boolean
  live: boolean
}

/** The table from PRD 13.2, transcribed. */
const MATRIX: { mode: VisibilityMode; expected: Expected }[] = [
  {
    mode: 'full',
    expected: {
      targetKind: 'case-study',
      targetHref: '/projects/example-project',
      github: true,
      live: true,
    },
  },
  {
    mode: 'case_study_only',
    expected: {
      targetKind: 'case-study',
      targetHref: '/projects/example-project',
      github: false,
      live: false,
    },
  },
  {
    mode: 'github_only',
    expected: {
      targetKind: 'external',
      targetHref: 'https://github.com/example/repo',
      github: true,
      live: false,
    },
  },
  {
    mode: 'live_demo_only',
    expected: {
      targetKind: 'external',
      targetHref: 'https://example.com',
      github: false,
      live: true,
    },
  },
  {
    mode: 'private',
    expected: { targetKind: 'none', github: false, live: false },
  },
]

describe('resolveCardLinks — all five visibility modes (AC-PROJ-11)', () => {
  for (const { mode, expected } of MATRIX) {
    it(`${mode}: links to ${expected.targetKind}, github=${expected.github}, live=${expected.live}`, () => {
      const result = resolveCardLinks({ ...base, visibilityMode: mode })

      expect(result.target.kind).toBe(expected.targetKind)
      if (expected.targetHref) {
        expect(result.target).toHaveProperty('href', expected.targetHref)
      }
      expect(result.showGithubIcon).toBe(expected.github)
      expect(result.showLiveIcon).toBe(expected.live)
    })
  }

  it('never exposes a GitHub or live link in case_study_only, even when both URLs exist', () => {
    // The regression that matters: the URLs are populated, and the mode is the
    // only thing keeping them hidden.
    const result = resolveCardLinks({ ...base, visibilityMode: 'case_study_only' })
    expect(result.showGithubIcon).toBe(false)
    expect(result.showLiveIcon).toBe(false)
  })

  it('never links a private project anywhere', () => {
    const result = resolveCardLinks({ ...base, visibilityMode: 'private' })
    expect(result.target.kind).toBe('none')
  })
})

describe('resolveCardLinks — missing URLs', () => {
  it('full mode hides each icon independently when its URL is absent', () => {
    expect(
      resolveCardLinks({ ...base, visibilityMode: 'full', githubUrl: null }).showGithubIcon,
    ).toBe(false)
    expect(resolveCardLinks({ ...base, visibilityMode: 'full', liveUrl: null }).showLiveIcon).toBe(
      false,
    )
  })

  /*
   * A DB constraint (projects_github_only_requires_url) makes this state
   * unreachable through normal writes. It is tested anyway because "the
   * database prevents it" is an argument that stops holding the moment someone
   * writes a migration that drops the constraint — and the failure mode here
   * is a card linking to "undefined".
   */
  it('degrades to an inert card rather than linking nowhere if the required URL is missing', () => {
    expect(
      resolveCardLinks({ ...base, visibilityMode: 'github_only', githubUrl: null }).target.kind,
    ).toBe('none')
    expect(
      resolveCardLinks({ ...base, visibilityMode: 'live_demo_only', liveUrl: null }).target.kind,
    ).toBe('none')
  })
})

describe('hasCaseStudyPage', () => {
  it('is true only for the two modes that render a case study', () => {
    expect(hasCaseStudyPage('full')).toBe(true)
    expect(hasCaseStudyPage('case_study_only')).toBe(true)
    expect(hasCaseStudyPage('github_only')).toBe(false)
    expect(hasCaseStudyPage('live_demo_only')).toBe(false)
    expect(hasCaseStudyPage('private')).toBe(false)
  })

  it('is what keeps non-case-study projects out of the sitemap (SEO-06)', () => {
    // A sitemap listing /projects/:slug for a github_only project would send
    // crawlers to a 404.
    const modes: VisibilityMode[] = [
      'full',
      'case_study_only',
      'github_only',
      'live_demo_only',
      'private',
    ]
    expect(modes.filter(hasCaseStudyPage)).toEqual(['full', 'case_study_only'])
  })
})

describe('serviceTypeForCategory (FR-CASE-09)', () => {
  it('maps each project category to a valid contact service type', () => {
    const cases: [ProjectCategory, string][] = [
      ['ai_automation', 'ai_automation'],
      ['web_application', 'web_application'],
      ['business_process_automation', 'business_process_automation'],
      // The enums differ: project_category has data_reporting, service_type
      // does not. That is why this is an explicit map and not a cast.
      ['data_reporting', 'other'],
      ['other', 'other'],
    ]
    for (const [category, expected] of cases) {
      expect(serviceTypeForCategory(category)).toBe(expected)
    }
  })
})
