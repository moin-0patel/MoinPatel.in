import { useParams } from 'react-router-dom'

import { PagePlaceholder } from '@/components/common/PagePlaceholder'
import { LoadingRegion } from '@/components/ui/Skeleton'
import { SkeletonText } from '@/components/ui/Skeleton'
import { useProject } from '@/hooks/useProjects'

import NotFoundPage from './NotFoundPage'

/**
 * Case study — PRD Section 14, the thirteen blocks in fixed order.
 *
 * Phase 9 builds the blocks. What is wired now is the part that must be right
 * from the start: the fetch-by-slug, and the fact that a missing OR unpublished
 * slug renders the same 404 as a nonexistent one (FR-CASE-01, AC-PROJ-8).
 * Getting that wrong later means leaking which drafts exist.
 */
export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: project, isPending, isError } = useProject(slug)

  if (isPending) {
    return (
      <LoadingRegion label="Loading case study" className="container-page py-20">
        <SkeletonText lines={6} />
      </LoadingRegion>
    )
  }

  // `null` covers both "no such project" and "exists but is a draft" — the
  // service deliberately cannot tell them apart, and neither can this page.
  if (isError || !project) return <NotFoundPage />

  return (
    <PagePlaceholder
      title={project.seoTitle ?? project.title}
      heading={project.title}
      phase="Phase 9"
      description={project.seoDescription ?? project.summary}
    />
  )
}
