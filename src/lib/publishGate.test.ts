import { describe, expect, it } from 'vitest'

import {
  canPublish,
  getConfidentialityReminder,
  getPublishBlockers,
  type PublishGateInput,
} from './publishGate'

/**
 * Publish gate — PRD FR-ADM-11 (P0).
 *
 * This is the last thing standing between a half-written draft and the public
 * site, so its failure mode is a project shipping as a card pretending to be a
 * case study (G-02), or an image published with no alt text (A11Y-06).
 */

const publishable: PublishGateInput = {
  title: 'Capiche AI Feedback Automation',
  slug: 'capiche-ai-feedback-automation',
  summary: 'An automated pipeline that turns scanned feedback into structured data.',
  category: 'ai_automation',
  status: 'completed',
  descriptionMd: 'A processing pipeline.',
  problemMd: '',
  solutionMd: '',
  howItWorksMd: '',
  businessImpactMd: '',
  visibilityMode: 'case_study_only',
  githubUrl: '',
  liveUrl: '',
  images: [],
  coverImagePath: '',
  coverImageAlt: '',
}

const gate = (overrides: Partial<PublishGateInput> = {}) =>
  getPublishBlockers({ ...publishable, ...overrides })

describe('a complete project passes', () => {
  it('has no blockers', () => {
    expect(gate()).toEqual([])
    expect(canPublish(publishable)).toBe(true)
  })
})

describe('required basics', () => {
  it.each([
    ['title', { title: '' }],
    ['slug', { slug: '' }],
    ['summary', { summary: '' }],
    ['category', { category: '' as const }],
    ['status', { status: '' as const }],
  ])('blocks on a missing %s', (_field, override) => {
    const blockers = gate(override)
    expect(blockers.length).toBeGreaterThan(0)
    expect(blockers.every((b) => b.section === 'basics')).toBe(true)
  })

  it('treats whitespace-only as missing', () => {
    // Otherwise a space bar satisfies the gate and the card renders blank.
    expect(gate({ title: '   ' })).toHaveLength(1)
    expect(gate({ summary: '\n\t ' })).toHaveLength(1)
  })

  it('reports every missing basic at once, not one at a time', () => {
    // Fixing five fields across five save attempts is a miserable loop.
    const blockers = gate({ title: '', slug: '', summary: '', category: '', status: '' })
    expect(blockers).toHaveLength(5)
  })
})

describe('case-study content (G-02)', () => {
  const empty = {
    descriptionMd: '',
    problemMd: '',
    solutionMd: '',
    howItWorksMd: '',
    businessImpactMd: '',
  }

  it('blocks when every case-study field is empty', () => {
    const blockers = gate(empty)
    expect(blockers).toHaveLength(1)
    expect(blockers[0]?.section).toBe('case-study')
  })

  it.each([
    'descriptionMd',
    'problemMd',
    'solutionMd',
    'howItWorksMd',
    'businessImpactMd',
  ] as const)('passes when only %s is populated', (field) => {
    expect(gate({ ...empty, [field]: 'Some real content.' })).toEqual([])
  })

  it('does not accept whitespace as content', () => {
    expect(gate({ ...empty, problemMd: '   \n  ' })).toHaveLength(1)
  })
})

describe('alt text (A11Y-06, MED-03)', () => {
  it('blocks a cover image with no alt text', () => {
    const blockers = gate({ coverImagePath: 'projects/x/cover.webp', coverImageAlt: '' })
    expect(blockers).toHaveLength(1)
    expect(blockers[0]?.section).toBe('media')
  })

  it('passes a cover image WITH alt text', () => {
    expect(
      gate({ coverImagePath: 'projects/x/cover.webp', coverImageAlt: 'The costing screen' }),
    ).toEqual([])
  })

  it('does not demand alt text when there is no cover image', () => {
    expect(gate({ coverImagePath: '', coverImageAlt: '' })).toEqual([])
  })

  it('blocks on gallery images missing alt text and counts them', () => {
    const blockers = gate({
      images: [{ altText: 'ok' }, { altText: '' }, { altText: '  ' }],
    })
    expect(blockers).toHaveLength(1)
    expect(blockers[0]?.message).toContain('2 images')
  })

  it('uses the singular for exactly one', () => {
    const blockers = gate({ images: [{ altText: '' }] })
    expect(blockers[0]?.message).toContain('1 image')
    expect(blockers[0]?.message).not.toContain('1 images')
  })
})

describe('visibility mode URL requirements (13.2)', () => {
  it('blocks github_only with no GitHub URL', () => {
    const blockers = gate({ visibilityMode: 'github_only', githubUrl: '' })
    expect(blockers).toHaveLength(1)
    expect(blockers[0]?.section).toBe('links')
  })

  it('passes github_only WITH a GitHub URL', () => {
    expect(gate({ visibilityMode: 'github_only', githubUrl: 'https://github.com/x/y' })).toEqual([])
  })

  it('blocks live_demo_only with no live URL', () => {
    expect(gate({ visibilityMode: 'live_demo_only', liveUrl: '' })).toHaveLength(1)
  })

  it('does not require URLs for full, case_study_only or private', () => {
    for (const visibilityMode of ['full', 'case_study_only', 'private'] as const) {
      expect(gate({ visibilityMode, githubUrl: '', liveUrl: '' }), visibilityMode).toEqual([])
    }
  })
})

describe('getConfidentialityReminder (FR-PROJ-16, R-02)', () => {
  it('warns when a published project has an undisclosed client', () => {
    const reminder = getConfidentialityReminder({
      clientDisclosed: false,
      clientName: 'Some Employer',
      publicationState: 'published',
    })
    expect(reminder).toContain('undisclosed')
  })

  it('stays quiet for a draft — there is nothing public to leak yet', () => {
    expect(
      getConfidentialityReminder({
        clientDisclosed: false,
        clientName: 'Some Employer',
        publicationState: 'draft',
      }),
    ).toBeNull()
  })

  it('stays quiet once disclosure is granted', () => {
    expect(
      getConfidentialityReminder({
        clientDisclosed: true,
        clientName: 'Some Employer',
        publicationState: 'published',
      }),
    ).toBeNull()
  })

  it('is a reminder, never a publish blocker', () => {
    // Publishing with the client undisclosed is legitimate — it is the safe
    // default. The gate must not conflate "needs care" with "not allowed".
    expect(canPublish(publishable)).toBe(true)
  })
})
