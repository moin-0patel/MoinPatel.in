import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

import { publicKeysFor, queryKeys } from '@/lib/queryKeys'
import {
  deleteEducation,
  deleteExperience,
  deleteSkill,
  deleteSkillCategory,
  deleteSocialLink,
  getAdminProfile,
  listAdminEducation,
  listAdminExperience,
  listAdminSettings,
  listAdminSkills,
  listAdminSocialLinks,
  setExperienceItems,
  updateProfile,
  updateSetting,
  upsertEducation,
  upsertExperience,
  upsertSkill,
  upsertSkillCategory,
  upsertSocialLink,
  type AdminExperience,
  type AdminSkillCategory,
} from '@/services/adminContent.service'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

/**
 * Hooks for the smaller admin resources — PRD FE-03, 31.4.
 *
 * As with the project hooks: staleTime 0 and refetch on focus, because an
 * admin list showing stale data means you cannot tell whether your save took.
 * Every mutation invalidates the matching PUBLIC key too — otherwise the live
 * site keeps serving the old content for the full 5-minute staleTime and
 * publishing looks broken.
 */

const ADMIN_DEFAULTS = { staleTime: 0, refetchOnWindowFocus: true } as const

function useInvalidate(keys: readonly (readonly unknown[])[]) {
  const queryClient = useQueryClient()
  return () => {
    for (const key of keys) void queryClient.invalidateQueries({ queryKey: key })
  }
}

/* --- Experience ----------------------------------------------------------- */

export function useAdminExperience(): UseQueryResult<AdminExperience[]> {
  return useQuery({
    queryKey: queryKeys.experience.admin(),
    queryFn: listAdminExperience,
    ...ADMIN_DEFAULTS,
  })
}

export function useSaveExperience() {
  const invalidate = useInvalidate(publicKeysFor.experience())
  return useMutation({
    mutationFn: async ({
      id,
      values,
      responsibilities,
      achievements,
    }: {
      id?: string
      values: TablesInsert<'experience'>
      responsibilities: string[]
      achievements: string[]
    }) => {
      // Parent first, so a failure writing the bullets does not lose the role.
      const experienceId = await upsertExperience(values, id)
      await setExperienceItems(experienceId, responsibilities, achievements)
      return experienceId
    },
    onSuccess: invalidate,
  })
}

export function useDeleteExperience() {
  const invalidate = useInvalidate(publicKeysFor.experience())
  return useMutation({ mutationFn: deleteExperience, onSuccess: invalidate })
}

/* --- Skills --------------------------------------------------------------- */

export function useAdminSkills(): UseQueryResult<AdminSkillCategory[]> {
  return useQuery({
    queryKey: queryKeys.skills.admin(),
    queryFn: listAdminSkills,
    ...ADMIN_DEFAULTS,
  })
}

export function useSaveSkillCategory() {
  const invalidate = useInvalidate(publicKeysFor.skills())
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: TablesInsert<'skill_categories'> }) =>
      upsertSkillCategory(values, id),
    onSuccess: invalidate,
  })
}

export function useSaveSkill() {
  const invalidate = useInvalidate(publicKeysFor.skills())
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: TablesInsert<'skills'> }) =>
      upsertSkill(values, id),
    onSuccess: invalidate,
  })
}

export function useDeleteSkill() {
  const invalidate = useInvalidate(publicKeysFor.skills())
  return useMutation({ mutationFn: deleteSkill, onSuccess: invalidate })
}

export function useDeleteSkillCategory() {
  const invalidate = useInvalidate(publicKeysFor.skills())
  return useMutation({ mutationFn: deleteSkillCategory, onSuccess: invalidate })
}

/* --- Education ------------------------------------------------------------ */

export function useAdminEducation(): UseQueryResult<Tables<'education'>[]> {
  return useQuery({
    queryKey: queryKeys.education.admin(),
    queryFn: listAdminEducation,
    ...ADMIN_DEFAULTS,
  })
}

export function useSaveEducation() {
  const invalidate = useInvalidate(publicKeysFor.education())
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: TablesInsert<'education'> }) =>
      upsertEducation(values, id),
    onSuccess: invalidate,
  })
}

export function useDeleteEducation() {
  const invalidate = useInvalidate(publicKeysFor.education())
  return useMutation({ mutationFn: deleteEducation, onSuccess: invalidate })
}

/* --- Social links --------------------------------------------------------- */

export function useAdminSocialLinks(): UseQueryResult<Tables<'social_links'>[]> {
  return useQuery({
    queryKey: queryKeys.social.admin(),
    queryFn: listAdminSocialLinks,
    ...ADMIN_DEFAULTS,
  })
}

export function useSaveSocialLink() {
  const invalidate = useInvalidate(publicKeysFor.social())
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: TablesInsert<'social_links'> }) =>
      upsertSocialLink(values, id),
    onSuccess: invalidate,
  })
}

export function useDeleteSocialLink() {
  const invalidate = useInvalidate(publicKeysFor.social())
  return useMutation({ mutationFn: deleteSocialLink, onSuccess: invalidate })
}

/* --- Profile and settings ------------------------------------------------- */

export function useAdminProfile(): UseQueryResult<Tables<'profiles'> | null> {
  return useQuery({
    queryKey: [...queryKeys.profile.all, 'admin'],
    queryFn: getAdminProfile,
    ...ADMIN_DEFAULTS,
  })
}

export function useUpdateProfile() {
  const invalidate = useInvalidate(publicKeysFor.profile())
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'profiles'> }) =>
      updateProfile(id, patch),
    onSuccess: invalidate,
  })
}

export function useAdminSettings(): UseQueryResult<Tables<'site_settings'>[]> {
  return useQuery({
    queryKey: [...queryKeys.settings.all, 'admin'],
    queryFn: listAdminSettings,
    ...ADMIN_DEFAULTS,
  })
}

export function useUpdateSetting() {
  const invalidate = useInvalidate(publicKeysFor.settings())
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => updateSetting(key, value),
    onSuccess: invalidate,
  })
}
