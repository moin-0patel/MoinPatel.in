import type { ComponentType } from 'react'

import { GithubIcon, LinkedinIcon } from './BrandIcon'

/**
 * The registry that `social_links.icon_key` and `technologies.icon_key`
 * resolve against (PRD 23.5, 23.13: "maps to a local icon registry; no remote
 * icon fetching").
 *
 * Kept out of BrandIcon.tsx so that file exports only components, which is
 * what keeps Fast Refresh working on it during development.
 *
 * An unknown key returns undefined so the caller falls back rather than
 * crashing — an admin typo in a lookup value must not take a section down.
 */
export const BRAND_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
}
