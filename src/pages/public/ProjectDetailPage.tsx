import { ArrowRight, ExternalLink, PlayCircle } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Gallery } from '@/components/common/Lightbox'
import { PipelineDiagram } from '@/components/common/PipelineDiagram'
import { Prose } from '@/components/common/Prose'
import { PROJECT_CLAIMS } from '@/content/project-claims'
import { SEO } from '@/components/common/SEO'
import { StatusBadge } from '@/components/ui/Badge'
import { GithubIcon } from '@/components/ui/BrandIcon'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { LoadingRegion, Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { useProject, useNextProject } from '@/hooks/useProjects'
import { useScrollSpy } from '@/hooks/useScrollSpy'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useSettings } from '@/hooks/useSiteContent'
import { cn } from '@/lib/cn'
import { formatDateRange } from '@/lib/dates'
import { projectMeta } from '@/lib/seo'
import { imageSizes, publicStorageUrl } from '@/lib/storage'
import { serviceTypeForCategory } from '@/lib/visibility'
import type { Project, TechCategory } from '@/types/domain'

import NotFoundPage from './NotFoundPage'

/**
 * Case study — PRD Section 14.
 *
 * The thirteen blocks render in the fixed order of 14.1. A block is omitted
 * ENTIRELY — heading included — when its source field is empty. That rule is
 * why every block below is guarded rather than rendered with a fallback: an
 * empty "Challenges" heading tells a reader the author gave up, which is worse
 * than the section not existing.
 *
 * The audience conflict from Section 5 is resolved by ordering, not by
 * compromise: Problem/Solution/Impact speak business, Architecture/Technology
 * speak engineering, and the sticky nav lets either reader jump past what is
 * useless to them.
 */
export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: project, isPending, isError } = useProject(slug)
  const { data: nextProject } = useNextProject(slug)
  const { data: settings } = useSettings()

  if (isPending) return <CaseStudySkeleton />

  // FR-CASE-01 / AC-PROJ-8 — a missing slug and an unpublished one are
  // indistinguishable here because the service cannot tell them apart either.
  // Revealing that a draft exists is the enumeration leak SEC-11 forbids.
  if (isError || !project) return <NotFoundPage />

  return <CaseStudy project={project} nextProject={nextProject ?? null} settings={settings} />
}

function CaseStudy({
  project,
  nextProject,
  settings,
}: {
  project: Project
  nextProject: ReturnType<typeof useNextProject>['data']
  settings: ReturnType<typeof useSettings>['data']
}) {
  const isDesktop = useIsDesktop()

  // 14.1 — only the blocks that actually have content. This one list drives
  // both the rendering guards and the in-page nav, so the two cannot drift.
  const blocks = useMemo(
    () =>
      [
        { id: 'overview', label: 'Overview', present: Boolean(project.descriptionMd) },
        { id: 'role', label: 'My Role', present: Boolean(project.roleDescription) },
        { id: 'problem', label: 'The Problem', present: Boolean(project.problemMd) },
        { id: 'solution', label: 'The Solution', present: Boolean(project.solutionMd) },
        { id: 'how-it-works', label: 'How It Works', present: Boolean(project.howItWorksMd) },
        {
          id: 'architecture',
          label: 'Architecture',
          present: project.pipelineSteps.length > 0 || Boolean(project.architectureMd),
        },
        { id: 'technology', label: 'Technology', present: project.technologies.length > 0 },
        { id: 'impact', label: 'Business Impact', present: Boolean(project.businessImpactMd) },
        {
          id: 'screenshots',
          label: 'Screenshots',
          present: project.images.some((i) => i.role === 'screenshot' || i.role === 'gallery'),
        },
        { id: 'challenges', label: 'Challenges', present: Boolean(project.challengesMd) },
        { id: 'lessons', label: 'What I Learned', present: Boolean(project.lessonsMd) },
      ].filter((block) => block.present),
    [project],
  )

  // FR-CASE-06 — the spy only runs where the nav is shown (>= 1024px).
  const activeId = useScrollSpy(
    blocks.map((b) => b.id),
    isDesktop,
  )

  const meta = projectMeta(project)
  const coverUrl = publicStorageUrl('projects', project.coverImagePath)
  const architectureImage = project.images.find((i) => i.role === 'architecture')
  const galleryImages = project.images.filter(
    (i) => i.role === 'screenshot' || i.role === 'gallery',
  )

  // SEO-04 resolution order: the project's own OG image, then its cover, then
  // the site default.
  const ogImage =
    publicStorageUrl('projects', project.ogImagePath) ??
    coverUrl ??
    publicStorageUrl('profile', settings?.defaultOgImagePath ?? null)

  // 13.2 — visibility_mode decides which outbound links exist at all.
  const showGithub = project.visibilityMode === 'full' && project.githubUrl
  const showLive = project.visibilityMode === 'full' && project.liveUrl
  const showVideo = project.visibilityMode === 'full' && project.videoUrl

  return (
    <>
      <SEO
        title={meta.title}
        description={meta.description}
        image={ogImage}
        canonicalPath={`/projects/${project.slug}`}
        type="article"
      />

      {/* --- 1. Project hero --- */}
      <header className="container-page pt-12 pb-8 md:pt-20">
        <div className="measure">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <span className="text-muted font-mono text-xs tracking-(--tracking-mono)">
              {formatDateRange(project.startedOn, project.completedOn, false)}
            </span>
          </div>

          {/*
           * The case-study title is the page's largest type, uppercase — and
           * FLAT INK, not gradient text.
           *
           * It used to run black -> dark cyan through the glyphs, which was the
           * old dark palette's display treatment carried over from the home
           * hero. The reference sets every heading in one colour and uses no
           * gradient type anywhere, so this was the last piece of a look the
           * site no longer has.
           *
           * Dropping it also removes a measurement special case: `bg-clip-text`
           * paints through the glyph shapes, so the computed `color` is
           * `transparent` and verify-ui has to reconstruct the ratio from the
           * gradient stops rather than simply reading it.
           */}
          <h1 className="text-primary font-display text-3xl leading-[1.05] font-bold tracking-[-0.03em] uppercase md:text-4xl lg:text-5xl">
            {project.title}
          </h1>

          {project.subtitle && <p className="text-accent mt-3 text-lg">{project.subtitle}</p>}

          <p className="text-secondary mt-4 text-lg">{project.summary}</p>

          {/*
           * FR-PROJ-16 — `clientName` is non-null only when client_disclosed is
           * true; the service mapper drops it otherwise. This component cannot
           * render an undisclosed employer even by mistake, because the value
           * simply is not here.
           */}
          {project.clientName && (
            <p className="text-muted mt-3 text-sm">Built for {project.clientName}</p>
          )}

          {(showGithub || showLive || showVideo) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {showGithub && project.githubUrl && (
                <Button variant="secondary" size="sm" asChild>
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                    <GithubIcon className="size-4" />
                    View code
                    <span className="visually-hidden">(opens in a new tab)</span>
                  </a>
                </Button>
              )}
              {showLive && project.liveUrl && (
                <Button variant="secondary" size="sm" asChild>
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" aria-hidden="true" />
                    Live demo
                    <span className="visually-hidden">(opens in a new tab)</span>
                  </a>
                </Button>
              )}
              {showVideo && project.videoUrl && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={project.videoUrl} target="_blank" rel="noopener noreferrer">
                    <PlayCircle className="size-4" aria-hidden="true" />
                    Watch demo
                    <span className="visually-hidden">(opens in a new tab)</span>
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        {coverUrl && (
          <img
            src={coverUrl}
            alt={project.coverImageAlt ?? project.title}
            // The cover is the LCP element on this route.
            fetchPriority="high"
            decoding="async"
            sizes={imageSizes('full')}
            className="border-subtle mt-10 aspect-video w-full rounded-(--radius-lg) border object-cover"
          />
        )}
      </header>

      <ClaimBand slug={project.slug} />

      <div className="container-page grid gap-10 pb-16 lg:grid-cols-[200px_1fr] lg:gap-16">
        {/* FR-CASE-06 — sticky in-page nav, >= 1024px only, showing only the
            blocks that exist. Below that it is replaced by nothing: RES-03's
            "Jump to" disclosure is P1 and a short page does not need it. */}
        {blocks.length > 1 && (
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24">
              <p
                aria-hidden="true"
                className="text-muted mb-3 font-mono text-xs tracking-(--tracking-mono) uppercase"
              >
                On this page
              </p>
              <ul className="space-y-1">
                {blocks.map((block) => (
                  <li key={block.id}>
                    <a
                      href={`#${block.id}`}
                      aria-current={activeId === block.id ? 'true' : undefined}
                      className={cn(
                        'block border-l-2 py-1 pl-3 text-sm',
                        'transition-colors duration-(--duration-hover) ease-(--ease-out)',
                        activeId === block.id
                          ? 'border-accent text-primary'
                          : 'border-subtle text-muted hover:text-secondary hover:border-strong',
                      )}
                    >
                      {block.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}

        <div className="min-w-0">
          {/* --- 2. Overview --- */}
          <Block id="overview" title="Overview" show={Boolean(project.descriptionMd)}>
            <Prose markdown={project.descriptionMd} />
          </Block>

          {/*
           * --- 2b. My Role ---
           *
           * `role_description` existed in the schema, the fetch and the admin
           * editor ("Your role — what did you personally do?") but no public
           * surface ever rendered it — filled in by every project, shown by
           * none. Plain text by design (the admin field is a single input,
           * not markdown), so a <p> rather than <Prose>.
           */}
          <Block id="role" title="My Role" show={Boolean(project.roleDescription)}>
            <p className="text-secondary measure text-lg">{project.roleDescription}</p>
          </Block>

          {/* --- 3. The Problem --- */}
          <Block id="problem" title="The Problem" show={Boolean(project.problemMd)}>
            <Prose markdown={project.problemMd} />
          </Block>

          {/* --- 4. The Solution --- */}
          <Block id="solution" title="The Solution" show={Boolean(project.solutionMd)}>
            <Prose markdown={project.solutionMd} />
          </Block>

          {/* --- 5. How It Works --- */}
          <Block id="how-it-works" title="How It Works" show={Boolean(project.howItWorksMd)}>
            <Prose markdown={project.howItWorksMd} />
          </Block>

          {/* --- 6. Architecture / Workflow --- */}
          <Block
            id="architecture"
            title="Architecture"
            show={project.pipelineSteps.length > 0 || Boolean(project.architectureMd)}
            wide
          >
            <Prose markdown={project.architectureMd} />
            {/* FR-CASE-04 — the pipeline is an ordered visual, never prose. */}
            {project.pipelineSteps.length > 0 && (
              <div className="mt-6">
                <PipelineDiagram steps={project.pipelineSteps} />
              </div>
            )}
            {architectureImage && (
              <figure className="mt-8">
                <img
                  src={publicStorageUrl('projects', architectureImage.storagePath) ?? ''}
                  alt={architectureImage.altText}
                  loading="lazy"
                  decoding="async"
                  width={architectureImage.width ?? undefined}
                  height={architectureImage.height ?? undefined}
                  sizes={imageSizes('full')}
                  className="border-subtle w-full rounded-(--radius-lg) border"
                />
                {architectureImage.caption && (
                  <figcaption className="text-muted mt-2 text-sm">
                    {architectureImage.caption}
                  </figcaption>
                )}
              </figure>
            )}
          </Block>

          {/* --- 7. Technology --- */}
          <Block id="technology" title="Technology" show={project.technologies.length > 0} wide>
            <TechnologyGroups project={project} />
          </Block>

          {/* --- 8. Business Impact --- */}
          <Block id="impact" title="Business Impact" show={Boolean(project.businessImpactMd)}>
            <Prose markdown={project.businessImpactMd} />
          </Block>

          {/* --- 9. Screenshots --- */}
          <Block id="screenshots" title="Screenshots" show={galleryImages.length > 0} wide>
            <Gallery images={galleryImages} projectTitle={project.title} />
          </Block>

          {/* --- 10. Challenges --- */}
          <Block id="challenges" title="Challenges" show={Boolean(project.challengesMd)}>
            <Prose markdown={project.challengesMd} />
          </Block>

          {/* --- 11. What I Learned --- */}
          <Block id="lessons" title="What I Learned" show={Boolean(project.lessonsMd)}>
            <Prose markdown={project.lessonsMd} />
          </Block>

          {/* --- 12/13. CTA and next project --- */}
          <section className="border-subtle mt-16 border-t pt-10">
            {/* FR-CASE-09 — deep-links to /contact with the service type mapped
                from the project's category, so the form arrives prefilled. */}
            <div className="from-accent-soft to-base border-subtle rounded-(--radius-lg) border bg-gradient-to-br p-6 text-center">
              <h2 className="text-primary text-xl">Have a process like this one?</h2>
              <p className="text-secondary measure mx-auto mt-2 text-sm">
                If your team is doing something similar by hand, it can probably be replaced.
              </p>
              <Button className="mt-5" shape="pill" asChild>
                <Link to={`/contact?service=${serviceTypeForCategory(project.category)}`}>
                  Discuss a similar system
                </Link>
              </Button>
            </div>

            {/* FR-CASE-08 — never the current project, never an unpublished
                one. The service enforces both and returns null otherwise. */}
            {nextProject && (
              <Link
                to={`/projects/${nextProject.slug}`}
                className={cn(
                  'group border-subtle bg-surface mt-6 flex items-center justify-between gap-4',
                  'rounded-(--radius-lg) border p-5',
                  'transition-colors duration-(--duration-hover) ease-(--ease-out)',
                  'hover:border-strong',
                )}
              >
                <span className="min-w-0">
                  <span
                    aria-hidden="true"
                    className="text-muted block font-mono text-xs tracking-(--tracking-mono) uppercase"
                  >
                    Next project
                  </span>
                  <span className="text-primary group-hover:text-accent mt-1 block truncate font-medium">
                    {nextProject.title}
                  </span>
                </span>
                <ArrowRight className="text-muted size-5 shrink-0" aria-hidden="true" />
              </Link>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

/**
 * 14.1 — "A block is omitted entirely (heading included) when its source field
 * is empty — never rendered as an empty heading."
 *
 * Encoding that as a component rather than repeating `{x && (...)}` eleven
 * times means the rule cannot be forgotten on the twelfth block.
 */
/**
 * The design's "Impact Metrics" strip, without the invented arithmetic.
 *
 * See src/content/project-claims.ts for why these are structural facts rather
 * than percentages. A project with no claims renders nothing at all.
 */
function ClaimBand({ slug }: { slug: string }) {
  const claims = PROJECT_CLAIMS[slug]
  if (!claims || claims.length === 0) return null

  return (
    <section aria-labelledby="claims-heading" className="container-page pb-4">
      <h2 id="claims-heading" className="visually-hidden">
        What this system guarantees
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {claims.map((claim) => (
          <Card as="li" key={claim.label} className="min-w-0">
            <p className="text-accent font-mono text-xs tracking-(--tracking-mono) uppercase">
              {claim.label}
            </p>
            <p className="text-secondary mt-2 text-sm">{claim.detail}</p>
          </Card>
        ))}
      </ul>
    </section>
  )
}
function Block({
  id,
  title,
  show,
  wide = false,
  children,
}: {
  id: string
  title: string
  show: boolean
  /** Media and diagrams get the full 1200px; prose stays at 72ch (FR-CASE-10). */
  wide?: boolean
  children: React.ReactNode
}) {
  if (!show) return null

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 pt-12 first:pt-0">
      <h2 id={`${id}-heading`} className="text-primary mb-4 text-2xl">
        {title}
      </h2>
      <div className={wide ? undefined : 'measure'}>{children}</div>
    </section>
  )
}

/** FR-CASE-05 — grouped by technology category, primary before supporting. */
const TECH_CATEGORY_LABEL: Record<TechCategory, string> = {
  language: 'Languages',
  framework: 'Frameworks',
  database: 'Data',
  platform: 'Platforms',
  ai_service: 'AI services',
  automation_tool: 'Automation',
  business_tool: 'Business tools',
  devops: 'Tooling',
  other: 'Other',
}

function TechnologyGroups({ project }: { project: Project }) {
  const grouped = new Map<TechCategory, typeof project.technologies>()
  for (const tech of project.technologies) {
    const existing = grouped.get(tech.category) ?? []
    existing.push(tech)
    grouped.set(tech.category, existing)
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {[...grouped.entries()].map(([category, techs]) => (
        <div key={category}>
          <h3
            id={`tech-${category}`}
            className="text-muted mb-2 font-mono text-xs tracking-(--tracking-mono) uppercase"
          >
            {TECH_CATEGORY_LABEL[category]}
          </h3>
          <ul aria-labelledby={`tech-${category}`} className="flex flex-wrap gap-1.5">
            {/* Primary technologies get the stronger chip and sort first —
                that is the whole "primary vs supporting" distinction. */}
            {[...techs]
              .sort((a, b) => (a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1))
              .map((tech) => (
                <li key={tech.id}>
                  <Chip emphasis={tech.role === 'primary' ? 'core' : 'default'}>{tech.name}</Chip>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** PRD 39 — hero skeleton plus three prose blocks; the sticky nav appears only
 *  once the content is known, because its items depend on what exists. */
function CaseStudySkeleton() {
  return (
    <LoadingRegion label="Loading case study" className="container-page py-12 md:py-20">
      <div className="measure space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-4/5" />
        <SkeletonText lines={2} />
      </div>
      <Skeleton className="mt-10 aspect-video w-full rounded-(--radius-lg)" />
      <div className="measure mt-12 space-y-10">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <SkeletonText lines={4} />
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}
