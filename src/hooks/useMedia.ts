import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { publicKeysFor, queryKeys } from '@/lib/queryKeys'
import type { TablesInsert } from '@/types/database.types'
import {
  addProjectImage,
  deleteMedia,
  deleteProjectImage,
  findOrphanedMedia,
  listMedia,
  listProjectImages,
  uploadImage,
  type UploadBucket,
} from '@/services/media.service'
import {
  deleteResumeVersion,
  getAdminResumeUrl,
  listResumeVersions,
  publishResumeVersion,
  unpublishResumeVersion,
  uploadResumeVersion,
} from '@/services/resume.service'

/**
 * Media and resume hooks — PRD FE-03, MED-01…05, FR-RES-01…06.
 *
 * Components never call the services directly (FE-01); these own the caching
 * and the invalidation, so a single upload cannot leave one screen showing
 * stale state while another shows fresh.
 */

/* --- Images ---------------------------------------------------------------- */

export function useMediaObjects(bucket: UploadBucket) {
  return useQuery({
    queryKey: queryKeys.media.bucket(bucket),
    queryFn: () => listMedia(bucket),
    // Storage listing is a multi-request walk; a short stale time stops it
    // re-running every time the admin switches tabs.
    staleTime: 60_000,
  })
}

export function useOrphanedMedia(bucket: UploadBucket, enabled = false) {
  return useQuery({
    queryKey: queryKeys.media.orphans(bucket),
    queryFn: () => findOrphanedMedia(bucket),
    // MED-05 cross-references every project row, so it runs on request only.
    enabled,
    staleTime: 60_000,
  })
}

export function useUploadImage(bucket: UploadBucket, pathPrefix: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadImage(bucket, pathPrefix, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.bucket(bucket) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.orphans(bucket) })
    },
  })
}

export function useDeleteMedia(bucket: UploadBucket) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (path: string) => deleteMedia(bucket, path),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
      // A deleted cover changes what the public site renders.
      for (const key of publicKeysFor.projects()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

/* --- Resume ---------------------------------------------------------------- */

export function useResumeVersions() {
  return useQuery({
    queryKey: queryKeys.resume.admin(),
    queryFn: listResumeVersions,
  })
}

/**
 * Every resume mutation invalidates the PUBLIC published-resume key too.
 *
 * FR-RES-06 hides resume CTAs site-wide when nothing is published. Without
 * this, unpublishing in the admin leaves the header and hero still offering a
 * download that now 404s for visitors — until the cache happens to expire.
 */
function useResumeMutation<TArgs>(mutationFn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.resume.all })
    },
  })
}

export function useUploadResume() {
  return useResumeMutation<{ file: File; versionLabel?: string; notes?: string }>(
    ({ file, versionLabel, notes }) => uploadResumeVersion(file, { versionLabel, notes }),
  )
}

export function usePublishResume() {
  return useResumeMutation<string>(publishResumeVersion)
}

export function useUnpublishResume() {
  return useResumeMutation<string>(unpublishResumeVersion)
}

export function useDeleteResumeVersion() {
  return useResumeMutation<{ id: string; storagePath: string }>(({ id, storagePath }) =>
    deleteResumeVersion(id, storagePath),
  )
}

/**
 * Minted at click time, never cached.
 *
 * A signed URL cached under a query key would spend most of its life expired,
 * and the admin would click Preview and get an error. This is a mutation
 * precisely because it is an action with a short-lived result, not state.
 */
export function useAdminResumeUrl() {
  return useMutation({ mutationFn: (storagePath: string) => getAdminResumeUrl(storagePath) })
}

/* --- Project gallery ------------------------------------------------------- */

/**
 * Gallery rows for one project. `enabled` guards the unsaved-project case:
 * a new project has no id yet, and querying `eq('project_id', undefined)`
 * would fetch every image in the table.
 */
export function useProjectImages(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.media.projectImages(projectId ?? 'new'),
    queryFn: () => listProjectImages(projectId as string),
    enabled: Boolean(projectId),
  })
}

function useProjectImageMutation<TArgs>(
  projectId: string | undefined,
  mutationFn: (args: TArgs) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.media.projectImages(projectId ?? 'new'),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
      // The gallery is rendered on the public case study, so the public
      // caches are stale the moment a row changes.
      for (const key of publicKeysFor.projects()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useAddProjectImage(projectId: string | undefined) {
  return useProjectImageMutation<TablesInsert<'project_images'>>(projectId, addProjectImage)
}

export function useDeleteProjectImage(projectId: string | undefined) {
  return useProjectImageMutation<{ id: string; storagePath: string }>(
    projectId,
    ({ id, storagePath }) => deleteProjectImage(id, storagePath),
  )
}
