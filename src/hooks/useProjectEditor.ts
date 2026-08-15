import { useMutation, useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import {
  createProject,
  getProjectForEdit,
  isSlugAvailable,
  listAllTechnologies,
  setPipelineSteps,
  setProjectTechnologies,
  updateProject,
  type EditorProject,
} from '@/services/admin.service'
import type { Tables, TablesInsert } from '@/types/database.types'

/** Data hooks for the project editor — PRD 20.3. */

export function useProjectForEdit(id: string | undefined): UseQueryResult<EditorProject | null> {
  return useQuery({
    queryKey: queryKeys.projects.adminDetail(id ?? ''),
    queryFn: () => getProjectForEdit(id as string),
    enabled: Boolean(id),
    staleTime: 0,
  })
}

export function useAllTechnologies(): UseQueryResult<Tables<'technologies'>[]> {
  return useQuery({
    queryKey: queryKeys.technologies.list(),
    queryFn: listAllTechnologies,
    // The technology list barely changes and is only used to populate a
    // picker, so it does not need the admin staleTime: 0 treatment.
    staleTime: 5 * 60 * 1000,
  })
}

export type SaveProjectInput = {
  /** Absent for a create. */
  id?: string
  values: TablesInsert<'projects'>
  technologyIds: string[]
  pipelineSteps: { label: string; description: string | null; techNote: string | null }[]
}

/**
 * Save a project and its two child collections.
 *
 * These are three separate statements rather than one transaction, because
 * PostgREST has no multi-statement transaction over the REST API. The ordering
 * is chosen so a partial failure is recoverable rather than destructive: the
 * project row is written first, so if the technology or pipeline write fails,
 * the user's prose — the expensive part to re-type — is already saved. They
 * see an error and can retry; nothing they wrote is lost.
 *
 * Doing it the other way round, or deleting children before the parent write
 * succeeds, is how a failed save eats a case study.
 */
export function useSaveProject() {
  return useMutation({
    mutationFn: async ({ id, values, technologyIds, pipelineSteps }: SaveProjectInput) => {
      let projectId: string
      if (id) {
        await updateProject(id, values)
        projectId = id
      } else {
        projectId = await createProject(values)
      }

      await setProjectTechnologies(projectId, technologyIds)
      await setPipelineSteps(projectId, pipelineSteps)

      return projectId
    },
  })
}

/** AC-PROJ-2 — uniqueness checked before save, not discovered as a 23505. */
export function useSlugCheck() {
  return useMutation({
    mutationFn: ({ slug, excludeId }: { slug: string; excludeId?: string }) =>
      isSlugAvailable(slug, excludeId),
  })
}
