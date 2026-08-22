import { Chapter, ChapterNumber } from '@/components/common/Chapter'
import { PipelineDiagram } from '@/components/common/PipelineDiagram'
import { SectionHeading } from '@/components/common/Section'
import type { PipelineStep } from '@/types/domain'

/**
 * Chapter 05 — Engineering process, spec §12.
 *
 * IDEA → ARCHITECTURE → DEVELOPMENT → AUTOMATION → TESTING → DEPLOYMENT.
 *
 * Reuses `PipelineDiagram` rather than drawing a second process motif. That
 * component already solves the parts that matter — ordered-list semantics so
 * the sequence survives with CSS off, numbering that carries the order for
 * screen readers, horizontal above 1024px and vertical below (RES-10, never a
 * horizontal scroll container on a phone) — and a parallel implementation would
 * drift from it. It is also the same visual language the case studies use for
 * project pipelines, which is the point: the process a reader sees here is the
 * one they then see applied.
 *
 * The steps are static and shaped as `PipelineStep` so no adapter is needed.
 * They describe how Moin works, not a database record; `project_pipeline_steps`
 * belongs to individual projects and this is not one.
 *
 * `techNote` names only tools that appear in the real work — Supabase, React,
 * TypeScript, Vitest, Vercel, Apps Script. The spec says "each stage can reveal
 * relevant technologies"; inventing a stack for the sake of a fuller diagram
 * would be the same failure as inventing a metric.
 */

const PROCESS_STEPS: PipelineStep[] = [
  {
    id: 'idea',
    stepNumber: 1,
    label: 'Idea',
    description: 'Find the repetitive, manual step that actually costs time.',
    techNote: null,
    iconKey: null,
  },
  {
    id: 'architecture',
    stepNumber: 2,
    label: 'Architecture',
    description: 'Model the domain first. Decide what must be captured before it is lost.',
    techNote: 'Postgres · RLS',
    iconKey: null,
  },
  {
    id: 'development',
    stepNumber: 3,
    label: 'Development',
    description: 'Build the smallest thing that does the real job end to end.',
    techNote: 'React · TypeScript',
    iconKey: null,
  },
  {
    id: 'automation',
    stepNumber: 4,
    label: 'Automation',
    description: 'Put it on a schedule and let it run without a person watching.',
    techNote: 'Apps Script · triggers',
    iconKey: null,
  },
  {
    id: 'testing',
    stepNumber: 5,
    label: 'Testing',
    description: 'Verify against the real system, not a mock that agrees with itself.',
    techNote: 'Vitest · browser checks',
    iconKey: null,
  },
  {
    id: 'deployment',
    stepNumber: 6,
    label: 'Deployment',
    description: 'Ship it, then watch it report on its own health.',
    techNote: 'Vercel · digests',
    iconKey: null,
  },
]

export function ProcessSection() {
  return (
    <Chapter id="process" labelledBy="process-heading">
      <div className="flex items-start gap-4 md:gap-8">
        <ChapterNumber id="process" className="mt-2 shrink-0" />
        <div className="min-w-0 flex-1">
          <SectionHeading
            id="process-heading"
            eyebrow="Process"
            meta="BUILD_SEQUENCE"
            title="How a system gets built"
            description="The same six stages every time. The order is the point — modelling the domain after building the UI is how data you needed goes uncaptured."
          />
          <PipelineDiagram steps={PROCESS_STEPS} />
        </div>
      </div>
    </Chapter>
  )
}
