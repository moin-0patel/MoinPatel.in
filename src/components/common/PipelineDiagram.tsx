import { cn } from '@/lib/cn'
import type { PipelineStep } from '@/types/domain'

/**
 * PipelineDiagram — PRD FR-CASE-04 (P0), TD-10.
 *
 * "Architecture/workflow pipelines render as an ordered, numbered visual
 * sequence using the process-line motif — not as a prose paragraph."
 *
 * This is the component the whole `project_pipeline_steps` table exists for.
 * Storing a workflow as markdown would have made this impossible: the steps
 * would be a paragraph, unorderable in admin and unrenderable as a diagram.
 * Structured rows are what let a hiring manager see the mechanism at a glance
 * (Persona 3 fails if "AI-powered" is claimed with no pipeline named).
 *
 * RES-10: horizontal at >= 1024px, vertical below. It is NEVER horizontally
 * scrolled on mobile — a nine-step pipeline in a scroll container is a
 * pipeline nobody reads on a phone.
 *
 * Semantically an ordered list, so the sequence survives with CSS off and is
 * announced as "list, 9 items" rather than as loose text. The connector lines
 * and the arrows are `aria-hidden`; the numbering carries the order.
 */
export function PipelineDiagram({ steps }: { steps: PipelineStep[] }) {
  if (steps.length === 0) return null

  const ordered = [...steps].sort((a, b) => a.stepNumber - b.stepNumber)

  return (
    <ol
      className={cn(
        'relative grid gap-3',
        // Vertical below lg; a responsive auto-fit grid above it, so a 9-step
        // pipeline wraps onto rows instead of shrinking each step to nothing.
        'lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] lg:gap-4',
      )}
    >
      {ordered.map((step, index) => (
        <li key={step.id} className="relative">
          <article
            className={cn(
              'border-subtle bg-surface flex h-full flex-col rounded-[--radius-lg] border p-4',
              'transition-colors duration-[--duration-hover] ease-[--ease-out]',
              'hover:border-strong',
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              {/* Mono step number — the "small structural role" the mono face
                  exists for (32.2), and the accessible order marker. */}
              <span
                className={cn(
                  'bg-accent-soft text-accent grid size-7 shrink-0 place-items-center',
                  'rounded-[--radius-sm] font-mono text-xs tracking-[--tracking-mono]',
                )}
              >
                {String(step.stepNumber).padStart(2, '0')}
              </span>

              {/* The connector — the process-line motif. Decorative, desktop
                  only, and never drawn after the final step. */}
              {index < ordered.length - 1 && (
                <span
                  aria-hidden="true"
                  className="via-accent/30 hidden h-px flex-1 bg-gradient-to-r from-transparent to-transparent lg:block"
                />
              )}
            </div>

            {/* `text-[length:...]`, not `text-base` — the latter compiles to
                color:var(--color-base). It survived here only because
                `.text-primary` happens to sort after `.text-base`; the font
                size it was meant to set never applied. See HeroSection. */}
            <h3 className="text-primary font-display text-[length:var(--text-base)] font-semibold">
              {step.label}
            </h3>

            {step.description && (
              <p className="text-secondary mt-1.5 text-sm">{step.description}</p>
            )}

            {/* The named mechanism. Persona 3's whole test is whether the
                model/service is stated rather than implied. */}
            {step.techNote && (
              <p className="text-muted mt-auto pt-3 font-mono text-xs tracking-[--tracking-mono]">
                {step.techNote}
              </p>
            )}
          </article>

          {/* Vertical connector, mobile and tablet only. */}
          {index < ordered.length - 1 && (
            <span
              aria-hidden="true"
              className="via-accent/30 mx-auto block h-3 w-px bg-gradient-to-b from-transparent to-transparent lg:hidden"
            />
          )}
        </li>
      ))}
    </ol>
  )
}
