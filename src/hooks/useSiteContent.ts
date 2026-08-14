import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import {
  listPublishedEducation,
  listPublishedExperience,
  listSkillGroups,
  listSocialLinks,
} from '@/services/cv.service'
import { getProfile } from '@/services/profile.service'
import { getPublishedResume } from '@/services/resume.service'
import { getPublicSettings } from '@/services/settings.service'
import type {
  EducationRecord,
  ExperienceRecord,
  Profile,
  PublishedResume,
  SkillGroup,
  SocialLink,
} from '@/types/domain'
import type { SiteSettings } from '@/types/settings'

/**
 * Site content hooks — PRD FE-03.
 *
 * Each homepage section fetches through its own hook (12, "Global homepage
 * rules"), so a failure in one renders that section's error state and never
 * blanks the page. Sharing one big "page data" query would couple every
 * section's fate to the slowest and least reliable of them.
 */

export function useProfile(): UseQueryResult<Profile | null> {
  return useQuery({ queryKey: queryKeys.profile.detail(), queryFn: getProfile })
}

export function useSettings(): UseQueryResult<SiteSettings> {
  return useQuery({
    queryKey: queryKeys.settings.public(),
    queryFn: getPublicSettings,
    // Settings gate whole UI elements (the availability pill, the Resume
    // button). A longer stale window avoids them appearing and disappearing
    // as a visitor moves between routes.
    staleTime: 15 * 60 * 1000,
  })
}

export function useExperience(): UseQueryResult<ExperienceRecord[]> {
  return useQuery({ queryKey: queryKeys.experience.list(), queryFn: listPublishedExperience })
}

export function useSkillGroups(): UseQueryResult<SkillGroup[]> {
  return useQuery({ queryKey: queryKeys.skills.grouped(), queryFn: listSkillGroups })
}

export function useEducation(): UseQueryResult<EducationRecord[]> {
  return useQuery({ queryKey: queryKeys.education.list(), queryFn: listPublishedEducation })
}

export function useSocialLinks(): UseQueryResult<SocialLink[]> {
  return useQuery({ queryKey: queryKeys.social.list(), queryFn: listSocialLinks })
}

/**
 * FR-RES-06 — `null` here hides every resume CTA site-wide. Callers must treat
 * "still loading" and "no published resume" differently: rendering the button
 * optimistically and removing it later is the layout shift PERF-03 forbids.
 */
export function usePublishedResume(): UseQueryResult<PublishedResume | null> {
  return useQuery({ queryKey: queryKeys.resume.published(), queryFn: getPublishedResume })
}
