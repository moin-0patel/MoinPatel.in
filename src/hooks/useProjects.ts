import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import {
  getNextProject,
  getPublishedProjectBySlug,
  listFeaturedProjects,
  listPublishedProjects,
} from '@/services/projects.service'
import type { Project, ProjectFilters, ProjectSummary } from '@/types/domain'

/**
 * Project hooks — PRD FE-03.
 *
 * These own caching, keys and invalidation, and nothing else. Not one line of
 * query construction lives here; that is the service's job. If a filter needs
 * to change how the data is fetched, the change belongs in
 * `projects.service.ts`, not in a hook.
 */

export function useProjects(filters: ProjectFilters = {}): UseQueryResult<ProjectSummary[]> {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => listPublishedProjects(filters),
    // FR-PROJ / 39: keeping previous results while a filter change resolves is
    // what lets the grid dim to 60% instead of collapsing into skeletons.
    placeholderData: (previous) => previous,
  })
}

export function useFeaturedProjects(limit = 3): UseQueryResult<ProjectSummary[]> {
  return useQuery({
    queryKey: queryKeys.projects.featured(limit),
    queryFn: () => listFeaturedProjects(limit),
  })
}

/**
 * `null` means "no such published project" — the 404 path. FR-CASE-01 and
 * SEC-11 require that to be indistinguishable from "exists but is a draft",
 * which is why the service returns null for both rather than throwing
 * different errors.
 */
export function useProject(slug: string | undefined): UseQueryResult<Project | null> {
  return useQuery({
    queryKey: queryKeys.projects.detail(slug ?? ''),
    queryFn: () => getPublishedProjectBySlug(slug as string),
    enabled: Boolean(slug),
  })
}

export function useNextProject(slug: string | undefined): UseQueryResult<ProjectSummary | null> {
  return useQuery({
    queryKey: queryKeys.projects.next(slug ?? ''),
    queryFn: () => getNextProject(slug as string),
    enabled: Boolean(slug),
  })
}
