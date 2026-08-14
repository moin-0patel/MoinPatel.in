import { describe, expect, it } from 'vitest'

import { publicKeysFor, queryKeys } from './queryKeys'

/**
 * Query key factory — PRD 41.1: "key stability and correct invalidation
 * groupings."
 *
 * Both halves have a specific failure mode:
 *
 *   stability   — if the same filters produce different keys, every render
 *                 refetches and the cache never hits
 *   grouping    — if an admin key does not share a prefix with the public one,
 *                 publishing updates the admin list and leaves the live site
 *                 serving the old version for the full staleTime, which reads
 *                 as "publishing is broken" (31.4)
 */

describe('key stability', () => {
  it('produces the same key for the same filters', () => {
    expect(queryKeys.projects.list({ categories: ['ai_automation'] })).toEqual(
      queryKeys.projects.list({ categories: ['ai_automation'] }),
    )
  })

  it('is insensitive to filter key order', () => {
    const a = queryKeys.projects.list({ categories: ['ai_automation'], statuses: ['completed'] })
    const b = queryKeys.projects.list({ statuses: ['completed'], categories: ['ai_automation'] })
    expect(a).toEqual(b)
  })

  it('is insensitive to the order of values within a filter array', () => {
    // Toggling two chips in either order must land on the same cache entry.
    const a = queryKeys.projects.list({ categories: ['web_application', 'ai_automation'] })
    const b = queryKeys.projects.list({ categories: ['ai_automation', 'web_application'] })
    expect(a).toEqual(b)
  })

  it('treats no filters, empty filters and empty arrays as the same key', () => {
    const none = queryKeys.projects.list()
    expect(queryKeys.projects.list({})).toEqual(none)
    expect(queryKeys.projects.list({ categories: [] })).toEqual(none)
    expect(queryKeys.projects.list({ categories: [], statuses: [] })).toEqual(none)
  })

  it('produces different keys for genuinely different filters', () => {
    expect(queryKeys.projects.list({ categories: ['ai_automation'] })).not.toEqual(
      queryKeys.projects.list({ categories: ['web_application'] }),
    )
    expect(queryKeys.projects.list({ categories: ['ai_automation'] })).not.toEqual(
      queryKeys.projects.list(),
    )
  })
})

describe('invalidation groupings', () => {
  const startsWith = (key: readonly unknown[], prefix: readonly unknown[]) =>
    prefix.every((segment, index) => key[index] === segment)

  it('every project key shares the projects.all prefix', () => {
    const all = queryKeys.projects.all
    for (const key of [
      queryKeys.projects.list(),
      queryKeys.projects.list({ categories: ['other'] }),
      queryKeys.projects.featured(3),
      queryKeys.projects.detail('exam-build-platform'),
      queryKeys.projects.next('exam-build-platform'),
      queryKeys.projects.admin(),
      queryKeys.projects.adminDetail('id'),
    ]) {
      expect(startsWith(key, all), JSON.stringify(key)).toBe(true)
    }
  })

  it('invalidating projects.all therefore reaches the admin list AND the public list', () => {
    // This is the property that makes publishing appear on the live site.
    expect(startsWith(queryKeys.projects.admin(), queryKeys.projects.all)).toBe(true)
    expect(startsWith(queryKeys.projects.list(), queryKeys.projects.all)).toBe(true)
  })

  it('keeps admin project keys distinct from public ones', () => {
    // They must share a prefix but not collide: an admin list includes drafts,
    // and sharing a cache entry with the public list would leak them.
    expect(queryKeys.projects.admin()).not.toEqual(queryKeys.projects.list())
  })

  it('a project mutation invalidates projects and the dashboard counts', () => {
    const keys = publicKeysFor.projects()
    expect(keys).toContainEqual(queryKeys.projects.all)
    expect(keys).toContainEqual(queryKeys.dashboard.all)
  })

  it('message keys are grouped so status filters invalidate together', () => {
    expect(startsWith(queryKeys.messages.list('new'), queryKeys.messages.all)).toBe(true)
    expect(startsWith(queryKeys.messages.list(), queryKeys.messages.all)).toBe(true)
    expect(queryKeys.messages.list('new')).not.toEqual(queryKeys.messages.list('read'))
  })

  it('separates the top-level resource namespaces', () => {
    const roots = [
      queryKeys.profile.all,
      queryKeys.settings.all,
      queryKeys.projects.all,
      queryKeys.experience.all,
      queryKeys.skills.all,
      queryKeys.education.all,
      queryKeys.social.all,
      queryKeys.resume.all,
      queryKeys.messages.all,
      queryKeys.dashboard.all,
    ].map((key) => key[0])
    expect(new Set(roots).size).toBe(roots.length)
  })
})
