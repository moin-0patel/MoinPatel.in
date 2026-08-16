import type { ProjectFilters } from '@/types/domain'

/**
 * Query key factory — PRD 31.4.
 *
 * Centralised so invalidation is a decision made once rather than a string
 * guessed at each call site. The nesting is what makes FR-ADM / 31.4 work:
 * `queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })` after
 * an admin mutation invalidates every project list, detail and admin view in
 * one call, because they all share that prefix.
 *
 * Filters are serialised into the key so two different filter sets cache
 * independently and switching back to a previous set is instant.
 */

/** Stable serialisation: key order must not change the cache key. */
function stable(filters: ProjectFilters | undefined): string {
  if (!filters) return ''
  const entries = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && (!Array.isArray(v) || v.length > 0))
    .map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v] as const)
    .sort(([a], [b]) => a.localeCompare(b))
  return entries.length === 0 ? '' : JSON.stringify(entries)
}

export const queryKeys = {
  profile: {
    all: ['profile'] as const,
    detail: () => [...queryKeys.profile.all, 'detail'] as const,
  },

  settings: {
    all: ['settings'] as const,
    public: () => [...queryKeys.settings.all, 'public'] as const,
  },

  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: ProjectFilters) => [...queryKeys.projects.lists(), stable(filters)] as const,
    featured: (limit: number) => [...queryKeys.projects.all, 'featured', limit] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (slug: string) => [...queryKeys.projects.details(), slug] as const,
    next: (slug: string) => [...queryKeys.projects.all, 'next', slug] as const,
    // Admin lists are a separate branch: they include drafts, so they must not
    // share a cache entry with the public list of the same name.
    admin: () => [...queryKeys.projects.all, 'admin'] as const,
    adminDetail: (id: string) => [...queryKeys.projects.admin(), id] as const,
  },

  technologies: {
    all: ['technologies'] as const,
    list: () => [...queryKeys.technologies.all, 'list'] as const,
  },

  experience: {
    all: ['experience'] as const,
    list: () => [...queryKeys.experience.all, 'list'] as const,
    admin: () => [...queryKeys.experience.all, 'admin'] as const,
  },

  skills: {
    all: ['skills'] as const,
    grouped: () => [...queryKeys.skills.all, 'grouped'] as const,
    admin: () => [...queryKeys.skills.all, 'admin'] as const,
  },

  education: {
    all: ['education'] as const,
    list: () => [...queryKeys.education.all, 'list'] as const,
    admin: () => [...queryKeys.education.all, 'admin'] as const,
  },

  social: {
    all: ['social'] as const,
    list: () => [...queryKeys.social.all, 'list'] as const,
    admin: () => [...queryKeys.social.all, 'admin'] as const,
  },

  resume: {
    all: ['resume'] as const,
    published: () => [...queryKeys.resume.all, 'published'] as const,
    signedUrl: () => [...queryKeys.resume.all, 'signed-url'] as const,
    admin: () => [...queryKeys.resume.all, 'admin'] as const,
  },

  // MED-01 — storage objects, keyed by bucket. Separate from `projects` even
  // though covers live in that bucket: deleting an orphan must not invalidate
  // every public project list.
  media: {
    all: ['media'] as const,
    bucket: (bucket: string) => [...queryKeys.media.all, bucket] as const,
    orphans: (bucket: string) => [...queryKeys.media.all, bucket, 'orphans'] as const,
    projectImages: (projectId: string) =>
      [...queryKeys.media.all, 'project-images', projectId] as const,
  },

  messages: {
    all: ['messages'] as const,
    list: (status?: string) => [...queryKeys.messages.all, 'list', status ?? 'all'] as const,
    unreadCount: () => [...queryKeys.messages.all, 'unread-count'] as const,
  },

  auth: {
    all: ['auth'] as const,
    isAdmin: () => [...queryKeys.auth.all, 'is-admin'] as const,
  },

  dashboard: {
    all: ['dashboard'] as const,
    counts: () => [...queryKeys.dashboard.all, 'counts'] as const,
  },
} as const

/**
 * Which public keys an admin mutation must invalidate alongside its own.
 * PRD 31.4: "Admin mutations invalidate both the admin key and the
 * corresponding public key." Without this the site would keep serving the old
 * content from cache after a publish, which reads as "publishing is broken".
 */
export const publicKeysFor = {
  projects: () => [queryKeys.projects.all, queryKeys.dashboard.all],
  experience: () => [queryKeys.experience.all, queryKeys.dashboard.all],
  skills: () => [queryKeys.skills.all, queryKeys.dashboard.all],
  education: () => [queryKeys.education.all, queryKeys.dashboard.all],
  social: () => [queryKeys.social.all],
  profile: () => [queryKeys.profile.all],
  settings: () => [queryKeys.settings.all],
  resume: () => [queryKeys.resume.all, queryKeys.dashboard.all],
} as const
