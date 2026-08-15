import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, ArrowLeft, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ErrorState } from '@/components/common/States'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField, Input, Select, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useAllTechnologies,
  useProjectForEdit,
  useSaveProject,
  useSlugCheck,
} from '@/hooks/useProjectEditor'
import { useToast } from '@/hooks/useToast'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { cn } from '@/lib/cn'
import { getConfidentialityReminder, getPublishBlockers } from '@/lib/publishGate'
import { isValidSlug, slugify } from '@/lib/slug'
import type {
  ProjectCategory,
  ProjectStatus,
  PublicationState,
  VisibilityMode,
} from '@/types/domain'

/**
 * Project editor — PRD 20.3, FR-ADM-05, FR-ADM-11.
 *
 * A sectioned single form rather than a wizard. Writing a case study is not
 * linear: Moin's stated behaviour (Persona 4) is writing it in stages, so
 * every field must be reachable at any time and a half-finished draft must
 * always be saveable.
 *
 * Deliberately NOT here: the Media tab. Uploads need the storage layer
 * (Phase 14) — client-side resize to WebP, alt-text enforcement, the
 * delete-before-row flow. A file input that appears to work and silently
 * discards the file would be worse than an honest placeholder.
 */

const SECTIONS = [
  { id: 'basics', label: 'Basics' },
  { id: 'case-study', label: 'Case Study' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'technology', label: 'Technology' },
  { id: 'media', label: 'Media' },
  { id: 'links', label: 'Links & SEO' },
  { id: 'confidentiality', label: 'Confidentiality' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: 'ai_automation', label: 'AI Automation' },
  { value: 'web_application', label: 'Web Application' },
  { value: 'business_process_automation', label: 'Business Process Automation' },
  { value: 'data_reporting', label: 'Data & Reporting' },
  { value: 'other', label: 'Other' },
]

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'planned', label: 'Planned' },
  { value: 'maintained', label: 'Maintained' },
  { value: 'archived', label: 'Archived' },
]

const VISIBILITY_MODES: { value: VisibilityMode; label: string; hint: string }[] = [
  { value: 'full', label: 'Full', hint: 'Case study plus GitHub and live links.' },
  { value: 'case_study_only', label: 'Case study only', hint: 'No outbound links exposed.' },
  { value: 'github_only', label: 'GitHub only', hint: 'The card links straight to GitHub.' },
  {
    value: 'live_demo_only',
    label: 'Live demo only',
    hint: 'The card links straight to the demo.',
  },
  { value: 'private', label: 'Private', hint: 'Not rendered publicly at all.' },
]

type FormState = {
  title: string
  slug: string
  subtitle: string
  summary: string
  descriptionMd: string
  problemMd: string
  solutionMd: string
  howItWorksMd: string
  architectureMd: string
  businessImpactMd: string
  challengesMd: string
  lessonsMd: string
  roleDescription: string
  status: ProjectStatus
  category: ProjectCategory | ''
  publicationState: PublicationState
  visibilityMode: VisibilityMode
  isFeatured: boolean
  sortOrder: number
  startedOn: string
  completedOn: string
  githubUrl: string
  liveUrl: string
  videoUrl: string
  seoTitle: string
  seoDescription: string
  clientName: string
  clientDisclosed: boolean
  confidentialityNote: string
  technologyIds: string[]
  pipelineSteps: { label: string; description: string; techNote: string }[]
}

const EMPTY: FormState = {
  title: '',
  slug: '',
  subtitle: '',
  summary: '',
  descriptionMd: '',
  problemMd: '',
  solutionMd: '',
  howItWorksMd: '',
  architectureMd: '',
  businessImpactMd: '',
  challengesMd: '',
  lessonsMd: '',
  roleDescription: '',
  status: 'in_progress',
  category: '',
  publicationState: 'draft',
  visibilityMode: 'case_study_only',
  isFeatured: false,
  sortOrder: 0,
  startedOn: '',
  completedOn: '',
  githubUrl: '',
  liveUrl: '',
  videoUrl: '',
  seoTitle: '',
  seoDescription: '',
  clientName: '',
  // FR-PROJ-16 — the safe default. A new project does not disclose a client
  // until someone deliberately says it may.
  clientDisclosed: false,
  confidentialityNote: '',
  technologyIds: [],
  pipelineSteps: [],
}

export default function ProjectEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()

  const { data: loaded, isPending, isError, error, refetch } = useProjectForEdit(id)
  const { data: technologies } = useAllTechnologies()
  const save = useSaveProject()
  const slugCheck = useSlugCheck()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [dirty, setDirty] = useState(false)
  const [section, setSection] = useState<SectionId>('basics')
  const [slugTaken, setSlugTaken] = useState(false)
  // Once a slug has been published it is a live URL somewhere. Changing it
  // breaks every existing link (13.3 marks this warn-level, not forbidden).
  const [slugEverPublished, setSlugEverPublished] = useState(false)

  useEffect(() => {
    if (!loaded) return
    const p = loaded.project
    setForm({
      title: p.title,
      slug: p.slug,
      subtitle: p.subtitle ?? '',
      summary: p.summary,
      descriptionMd: p.description_md ?? '',
      problemMd: p.problem_md ?? '',
      solutionMd: p.solution_md ?? '',
      howItWorksMd: p.how_it_works_md ?? '',
      architectureMd: p.architecture_md ?? '',
      businessImpactMd: p.business_impact_md ?? '',
      challengesMd: p.challenges_md ?? '',
      lessonsMd: p.lessons_md ?? '',
      roleDescription: p.role_description ?? '',
      status: p.status,
      category: p.category,
      publicationState: p.publication_state,
      visibilityMode: p.visibility_mode,
      isFeatured: p.is_featured,
      sortOrder: p.sort_order,
      startedOn: p.started_on ?? '',
      completedOn: p.completed_on ?? '',
      githubUrl: p.github_url ?? '',
      liveUrl: p.live_url ?? '',
      videoUrl: p.video_url ?? '',
      seoTitle: p.seo_title ?? '',
      seoDescription: p.seo_description ?? '',
      clientName: p.client_name ?? '',
      clientDisclosed: p.client_disclosed,
      confidentialityNote: p.confidentiality_note ?? '',
      technologyIds: loaded.technologyIds,
      pipelineSteps: loaded.pipelineSteps.map((s) => ({
        label: s.label,
        description: s.description ?? '',
        techNote: s.tech_note ?? '',
      })),
    })
    setSlugEverPublished(p.published_at !== null)
    setDirty(false)
  }, [loaded])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setDirty(true)
  }

  const guard = useUnsavedChanges(dirty)

  const blockers = useMemo(
    () =>
      getPublishBlockers({
        ...form,
        images: loaded?.images.map((i) => ({ altText: i.alt_text })) ?? [],
        coverImagePath: loaded?.project.cover_image_path ?? '',
        coverImageAlt: loaded?.project.cover_image_alt ?? '',
      }),
    [form, loaded],
  )

  const confidentialityReminder = getConfidentialityReminder({
    clientDisclosed: form.clientDisclosed,
    clientName: form.clientName,
    publicationState: form.publicationState,
  })

  const handleTitleBlur = () => {
    // AC-PROJ-2 — the slug auto-generates from the title but stays editable.
    // Only filled in while empty, so it never overwrites a deliberate choice.
    if (!form.slug.trim() && form.title.trim()) set('slug', slugify(form.title))
  }

  const handleSlugBlur = async () => {
    const slug = form.slug.trim()
    if (!slug || !isValidSlug(slug)) return setSlugTaken(false)
    const available = await slugCheck.mutateAsync({ slug, excludeId: id })
    setSlugTaken(!available)
  }

  const handleSave = async () => {
    if (form.category === '') {
      setSection('basics')
      return toast.error('Choose a category before saving')
    }
    if (slugTaken) {
      setSection('basics')
      return toast.error('That slug is already in use')
    }
    // FR-ADM-11 — the gate applies to publishing, never to saving a draft.
    // Blocking a save would mean losing work, which is the opposite of the
    // point of drafts.
    if (form.publicationState === 'published' && blockers.length > 0) {
      setSection(blockers[0]?.section ?? 'basics')
      return toast.error('This project is not ready to publish', undefined)
    }

    try {
      const savedId = await save.mutateAsync({
        id,
        values: {
          title: form.title.trim(),
          slug: form.slug.trim(),
          subtitle: form.subtitle.trim() || null,
          summary: form.summary.trim(),
          description_md: form.descriptionMd.trim() || null,
          problem_md: form.problemMd.trim() || null,
          solution_md: form.solutionMd.trim() || null,
          how_it_works_md: form.howItWorksMd.trim() || null,
          architecture_md: form.architectureMd.trim() || null,
          business_impact_md: form.businessImpactMd.trim() || null,
          challenges_md: form.challengesMd.trim() || null,
          lessons_md: form.lessonsMd.trim() || null,
          role_description: form.roleDescription.trim() || null,
          status: form.status,
          category: form.category,
          publication_state: form.publicationState,
          visibility_mode: form.visibilityMode,
          is_featured: form.isFeatured,
          sort_order: form.sortOrder,
          started_on: form.startedOn || null,
          completed_on: form.completedOn || null,
          github_url: form.githubUrl.trim() || null,
          live_url: form.liveUrl.trim() || null,
          video_url: form.videoUrl.trim() || null,
          seo_title: form.seoTitle.trim() || null,
          seo_description: form.seoDescription.trim() || null,
          client_name: form.clientName.trim() || null,
          client_disclosed: form.clientDisclosed,
          confidentiality_note: form.confidentialityNote.trim() || null,
        },
        technologyIds: form.technologyIds,
        pipelineSteps: form.pipelineSteps.map((s) => ({
          label: s.label,
          description: s.description || null,
          techNote: s.techNote || null,
        })),
      })

      setDirty(false)
      toast.success(isNew ? 'Project created' : 'Project saved', form.title)
      if (isNew) void navigate(`/admin/projects/${savedId}/edit`, { replace: true })
    } catch (cause) {
      toast.error("Couldn't save the project", cause)
    }
  }

  if (!isNew && isPending) {
    return (
      <div className="space-y-3 p-6 lg:p-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full rounded-[--radius-lg]" />
      </div>
    )
  }

  if (!isNew && isError) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <Link
        to="/admin/projects"
        className="text-muted hover:text-primary inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All projects
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-primary truncate text-2xl">
            {isNew ? 'New project' : form.title || 'Untitled project'}
          </h1>
          {dirty && <p className="text-warning mt-1 text-sm">Unsaved changes</p>}
        </div>
        <Button loading={save.isPending} onClick={() => void handleSave()}>
          {isNew ? 'Create project' : 'Save'}
        </Button>
      </div>

      {/* FR-ADM-11 — the blockers are listed as a checklist, not hidden behind
          a disabled button with no explanation. */}
      {form.publicationState === 'published' && blockers.length > 0 && (
        <div className="border-danger/30 bg-danger-soft mt-5 rounded-[--radius-md] border p-4">
          <p className="text-danger text-sm font-medium">
            Not ready to publish — {blockers.length} thing{blockers.length === 1 ? '' : 's'} to fix:
          </p>
          <ul className="mt-2 space-y-1">
            {blockers.map((blocker, index) => (
              <li key={index} className="text-secondary text-sm">
                <button
                  type="button"
                  onClick={() => setSection(blocker.section)}
                  className="text-left underline underline-offset-2"
                >
                  {blocker.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* R-02 — a flag hides the client field, not the prose around it. */}
      {confidentialityReminder && (
        <div className="border-warning/30 bg-warning-soft mt-5 flex items-start gap-2.5 rounded-[--radius-md] border p-4">
          <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-secondary text-sm">{confidentialityReminder}</p>
        </div>
      )}

      {/* Sections as a tab list. Radix Tabs would unmount hidden panels, which
          would discard in-progress typing on every switch — so these are
          plain buttons over conditional rendering of a single form state. */}
      <div role="tablist" aria-label="Project sections" className="mt-6 flex flex-wrap gap-1.5">
        {SECTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={section === tab.id}
            onClick={() => setSection(tab.id)}
            className={cn(
              'h-11 rounded-[--radius-sm] border px-3 text-sm md:h-9',
              section === tab.id
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-subtle text-secondary hover:border-strong',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-3xl space-y-5">
        {section === 'basics' && (
          <BasicsSection
            form={form}
            set={set}
            onTitleBlur={handleTitleBlur}
            onSlugBlur={() => void handleSlugBlur()}
            slugTaken={slugTaken}
            slugEverPublished={slugEverPublished}
          />
        )}
        {section === 'case-study' && <CaseStudySection form={form} set={set} />}
        {section === 'pipeline' && <PipelineSection form={form} set={set} />}
        {section === 'technology' && (
          <TechnologySection form={form} set={set} technologies={technologies ?? []} />
        )}
        {section === 'media' && <MediaSection imageCount={loaded?.images.length ?? 0} />}
        {section === 'links' && <LinksSection form={form} set={set} />}
        {section === 'confidentiality' && <ConfidentialitySection form={form} set={set} />}
      </div>

      <UnsavedChangesDialog guard={guard} />
    </div>
  )
}

/* --- sections ------------------------------------------------------------- */

type SetField = <K extends keyof FormState>(key: K, value: FormState[K]) => void

function BasicsSection({
  form,
  set,
  onTitleBlur,
  onSlugBlur,
  slugTaken,
  slugEverPublished,
}: {
  form: FormState
  set: SetField
  onTitleBlur: () => void
  onSlugBlur: () => void
  slugTaken: boolean
  slugEverPublished: boolean
}) {
  const ids = { title: useId(), slug: useId(), summary: useId(), subtitle: useId() }
  const slugInvalid = form.slug.trim() !== '' && !isValidSlug(form.slug.trim())

  return (
    <>
      <FormField id={ids.title} label="Title" required>
        <Input
          id={ids.title}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          onBlur={onTitleBlur}
          maxLength={120}
        />
      </FormField>

      <FormField
        id={ids.slug}
        label="Slug"
        required
        hint="Lowercase, hyphenated. Auto-filled from the title; edit if you want something shorter."
        error={
          slugTaken
            ? 'Another project already uses this slug.'
            : slugInvalid
              ? 'Use lowercase letters, numbers and single hyphens only.'
              : undefined
        }
      >
        <Input
          id={ids.slug}
          value={form.slug}
          onChange={(e) => set('slug', e.target.value)}
          onBlur={onSlugBlur}
          className="font-mono"
        />
      </FormField>

      {/* 13.3 — warn-level, not forbidden. Changing a published slug breaks
          every link already shared, which for a portfolio is the whole point
          of having published it. */}
      {slugEverPublished && (
        <p className="text-warning text-xs">
          This project has been published before. Changing the slug breaks any link already shared.
        </p>
      )}

      <FormField id={ids.subtitle} label="Subtitle">
        <Input
          id={ids.subtitle}
          value={form.subtitle}
          onChange={(e) => set('subtitle', e.target.value)}
        />
      </FormField>

      <FormField
        id={ids.summary}
        label="Short description"
        required
        hint="Used on cards, meta descriptions and link previews. Max 200 characters."
        counter={<span className="text-muted font-mono text-xs">{form.summary.length} / 200</span>}
      >
        <Textarea
          id={ids.summary}
          rows={3}
          maxLength={200}
          value={form.summary}
          onChange={(e) => set('summary', e.target.value)}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Category"
          required
          value={form.category}
          onChange={(value) => set('category', value as ProjectCategory)}
          options={[{ value: '', label: 'Choose…' }, ...CATEGORIES]}
        />
        <SelectField
          label="Status"
          required
          value={form.status}
          onChange={(value) => set('status', value as ProjectStatus)}
          options={STATUSES}
          hint="How finished the work is — separate from whether it is live."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Publication state"
          value={form.publicationState}
          onChange={(value) => set('publicationState', value as PublicationState)}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
          ]}
          hint="Whether it appears on the public site."
        />
        <SelectField
          label="Visibility mode"
          value={form.visibilityMode}
          onChange={(value) => set('visibilityMode', value as VisibilityMode)}
          options={VISIBILITY_MODES}
          hint={VISIBILITY_MODES.find((m) => m.value === form.visibilityMode)?.hint}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <DateField label="Started" value={form.startedOn} onChange={(v) => set('startedOn', v)} />
        <DateField
          label="Completed"
          value={form.completedOn}
          onChange={(v) => set('completedOn', v)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <CheckboxField
          label="Featured on the homepage"
          hint="Up to three. A fourth will simply not fit the three-card row."
          checked={form.isFeatured}
          onChange={(v) => set('isFeatured', v)}
        />
        <NumberField
          label="Sort order"
          hint="Lower sorts first."
          value={form.sortOrder}
          onChange={(v) => set('sortOrder', v)}
        />
      </div>
    </>
  )
}

/** The field prompts double as writing prompts — R-12's stated mitigation. */
function CaseStudySection({ form, set }: { form: FormState; set: SetField }) {
  const fields: { key: keyof FormState; label: string; hint: string }[] = [
    {
      key: 'descriptionMd',
      label: 'Overview',
      hint: 'What is this system, in two or three sentences?',
    },
    {
      key: 'problemMd',
      label: 'The Problem',
      hint: 'What was happening before, in the words an operator would use? No jargon here.',
    },
    { key: 'solutionMd', label: 'The Solution', hint: 'What replaced it?' },
    {
      key: 'howItWorksMd',
      label: 'How It Works',
      hint: 'The mechanism, step by step. Name the models and services — do not just say "AI".',
    },
    {
      key: 'architectureMd',
      label: 'Architecture notes',
      hint: 'Prose around the pipeline diagram. The ordered steps go in the Pipeline tab.',
    },
    {
      key: 'businessImpactMd',
      label: 'Business Impact',
      hint: 'Qualitative unless you measured it. No invented percentages or currency figures.',
    },
    { key: 'challengesMd', label: 'Challenges', hint: 'What was actually hard?' },
    { key: 'lessonsMd', label: 'What I Learned', hint: 'What would you do differently?' },
    { key: 'roleDescription', label: 'Your role', hint: 'What did you personally do?' },
  ]

  return (
    <>
      <p className="text-muted text-sm">
        Markdown. Headings render as h3 and h4 — the page owns h1 and h2.
      </p>
      {fields.map((field) => (
        <MarkdownField
          key={String(field.key)}
          label={field.label}
          hint={field.hint}
          value={form[field.key] as string}
          onChange={(value) => set(field.key, value as FormState[typeof field.key])}
        />
      ))}
    </>
  )
}

function PipelineSection({ form, set }: { form: FormState; set: SetField }) {
  const steps = form.pipelineSteps

  const update = (index: number, patch: Partial<(typeof steps)[number]>) =>
    set(
      'pipelineSteps',
      steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    )

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    const [moved] = next.splice(index, 1)
    if (moved) next.splice(target, 0, moved)
    set('pipelineSteps', next)
  }

  return (
    <>
      <p className="text-muted text-sm">
        The ordered steps of the workflow. These render as a numbered diagram on the case study, not
        as a paragraph — which is what makes the mechanism legible at a glance.
      </p>

      {steps.length === 0 && (
        <p className="border-subtle text-muted rounded-[--radius-md] border border-dashed p-4 text-sm">
          No steps yet. Add one for each stage of the workflow.
        </p>
      )}

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="border-subtle bg-surface rounded-[--radius-md] border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-accent font-mono text-xs">
                <GripVertical className="mr-1 inline size-3.5" aria-hidden="true" />
                Step {index + 1}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move step ${index + 1} up`}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, 1)}
                  disabled={index === steps.length - 1}
                  aria-label={`Move step ${index + 1} down`}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set(
                      'pipelineSteps',
                      steps.filter((_, i) => i !== index),
                    )
                  }
                  aria-label={`Remove step ${index + 1}`}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <PlainField
                label="Label"
                value={step.label}
                onChange={(value) => update(index, { label: value })}
                placeholder="OCR extraction"
              />
              <PlainField
                label="Description"
                value={step.description}
                onChange={(value) => update(index, { description: value })}
                placeholder="Text extraction from the scanned images."
              />
              <PlainField
                label="Tech note"
                value={step.techNote}
                onChange={(value) => update(index, { techNote: value })}
                placeholder="Gemini 2.5 Flash"
              />
            </div>
          </li>
        ))}
      </ol>

      <Button
        variant="secondary"
        onClick={() =>
          set('pipelineSteps', [...steps, { label: '', description: '', techNote: '' }])
        }
      >
        <Plus className="size-4" aria-hidden="true" />
        Add step
      </Button>
    </>
  )
}

function TechnologySection({
  form,
  set,
  technologies,
}: {
  form: FormState
  set: SetField
  technologies: { id: string; name: string; category: string; published: boolean }[]
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof technologies>()
    for (const tech of technologies) {
      map.set(tech.category, [...(map.get(tech.category) ?? []), tech])
    }
    return [...map.entries()]
  }, [technologies])

  const toggle = (techId: string) =>
    set(
      'technologyIds',
      form.technologyIds.includes(techId)
        ? form.technologyIds.filter((id) => id !== techId)
        : [...form.technologyIds, techId],
    )

  return (
    <>
      <p className="text-muted text-sm">
        {form.technologyIds.length} selected. Order follows the order you tick them.
      </p>
      {grouped.map(([category, techs]) => (
        <fieldset key={category}>
          <legend className="text-muted mb-2 font-mono text-xs uppercase">
            {category.replace(/_/g, ' ')}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {techs.map((tech) => {
              const selected = form.technologyIds.includes(tech.id)
              return (
                <button
                  key={tech.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(tech.id)}
                  className={cn(
                    'h-9 rounded-[--radius-sm] border px-3 font-mono text-xs',
                    selected
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-subtle text-secondary hover:border-strong',
                  )}
                >
                  {tech.name}
                  {!tech.published && ' (unpublished)'}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </>
  )
}

/**
 * Honest placeholder. Uploads need the Phase 14 storage layer — client-side
 * resize to WebP, alt-text enforcement before publish, and the
 * delete-storage-before-row flow (MED-04/07). A file input that appeared to
 * work and silently dropped the file would be worse than saying so.
 */
function MediaSection({ imageCount }: { imageCount: number }) {
  return (
    <div className="border-subtle rounded-[--radius-lg] border border-dashed p-6">
      <Badge tone="outline">Phase 14</Badge>
      <p className="text-primary mt-3 font-medium">Image upload is not built yet</p>
      <p className="text-secondary measure mt-2 text-sm">
        Uploads need the storage layer: browser-side resize to WebP, alt text captured at upload and
        required before publish, and storage objects removed before the row on delete.
      </p>
      {imageCount > 0 && (
        <p className="text-muted mt-3 text-sm">
          This project already has {imageCount} image{imageCount === 1 ? '' : 's'} attached.
        </p>
      )}
    </div>
  )
}

function LinksSection({ form, set }: { form: FormState; set: SetField }) {
  return (
    <>
      <PlainField
        label="GitHub URL"
        value={form.githubUrl}
        onChange={(v) => set('githubUrl', v)}
        placeholder="https://github.com/…"
        hint="Must start with https://"
      />
      <PlainField
        label="Live URL"
        value={form.liveUrl}
        onChange={(v) => set('liveUrl', v)}
        placeholder="https://…"
      />
      <PlainField
        label="Video URL"
        value={form.videoUrl}
        onChange={(v) => set('videoUrl', v)}
        placeholder="https://youtube.com/…"
        hint="External embed. Video is never stored in Supabase."
      />
      <PlainField
        label="SEO title"
        value={form.seoTitle}
        onChange={(v) => set('seoTitle', v)}
        hint="Max 60 characters. Falls back to the title."
        maxLength={60}
      />
      <MarkdownField
        label="SEO description"
        value={form.seoDescription}
        onChange={(v) => set('seoDescription', v)}
        hint="Max 160 characters. Falls back to the short description."
        rows={3}
        maxLength={160}
      />
    </>
  )
}

function ConfidentialitySection({ form, set }: { form: FormState; set: SetField }) {
  return (
    <>
      <div className="border-warning/30 bg-warning-soft rounded-[--radius-md] border p-4">
        <p className="text-secondary text-sm">
          When the client is not disclosed, their name must not appear anywhere in this
          project&rsquo;s content — including inside screenshots. Do not upload images containing
          employer branding, customer data or internal pricing.
        </p>
      </div>

      <PlainField
        label="Client / employer"
        value={form.clientName}
        onChange={(v) => set('clientName', v)}
        hint="Stored either way. Only rendered publicly when disclosure is granted below."
      />

      <CheckboxField
        label="Disclosure granted — the client may be named publicly"
        hint="Leave off unless you have explicit permission. Written permission is strongly advised."
        checked={form.clientDisclosed}
        onChange={(v) => set('clientDisclosed', v)}
      />

      <MarkdownField
        label="Internal note"
        hint="Admin-only. Never selected by any public query."
        value={form.confidentialityNote}
        onChange={(v) => set('confidentialityNote', v)}
        rows={3}
      />
    </>
  )
}

/* --- small field wrappers -------------------------------------------------- */

function PlainField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  maxLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  placeholder?: string
  maxLength?: number
}) {
  const id = useId()
  return (
    <FormField id={id} label={label} hint={hint}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  )
}

function MarkdownField({
  label,
  value,
  onChange,
  hint,
  rows = 6,
  maxLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  rows?: number
  maxLength?: number
}) {
  const id = useId()
  return (
    <FormField id={id} label={label} hint={hint}>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-xs"
      />
    </FormField>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  hint?: string
  required?: boolean
}) {
  const id = useId()
  return (
    <FormField id={id} label={label} hint={hint} required={required}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <FormField id={id} label={label}>
      <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  )
}

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
}) {
  const id = useId()
  return (
    <FormField id={id} label={label} hint={hint}>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </FormField>
  )
}

function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  hint?: string
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-accent mt-0.5 size-4 shrink-0"
        />
        <label htmlFor={id} className="text-secondary text-sm font-medium">
          {label}
        </label>
      </div>
      {hint && <p className="text-muted pl-6.5 text-xs">{hint}</p>}
    </div>
  )
}

/** FR-ADM-05 — the in-app half of the unsaved-changes guard. */
function UnsavedChangesDialog({ guard }: { guard: ReturnType<typeof useUnsavedChanges> }) {
  return (
    <Dialog.Root open={guard.isBlocked} onOpenChange={(open) => !open && guard.cancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-base/80 fixed inset-0 z-50 backdrop-blur-sm" />
        <Dialog.Content className="bg-surface-raised border-subtle fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[--radius-xl] border p-6 shadow-[--shadow-overlay]">
          <Dialog.Title className="text-primary font-display text-lg font-semibold">
            Leave without saving?
          </Dialog.Title>
          <Dialog.Description className="text-secondary mt-2 text-sm">
            This project has unsaved changes. Leaving now discards them.
          </Dialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={guard.cancel}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={guard.proceed}>
              Discard changes
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
