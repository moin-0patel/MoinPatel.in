import { Section, SectionHeading } from '@/components/common/Section'
import { useProfile, useSettings } from '@/hooks/useSiteContent'

/**
 * FAQ — the reference's supporting-content section, with Moin's answers.
 *
 * WHY THESE FOUR AND NOT EIGHT
 *
 * The reference runs eight questions, but most of them are about a service
 * business it has and this one does not: pricing tiers, retainers, NDAs,
 * revision rounds, which plan to pick. Padding to eight would mean inventing a
 * commercial practice, so the count follows the answers rather than the layout.
 *
 * Every answer below restates something the site already demonstrates — the
 * capability areas, the three published systems, the stack recorded against
 * each project. Nothing here claims a service, a rate, a turnaround or a client
 * relationship, because none of those is established anywhere in the data.
 *
 * NATIVE <details>, not a JS accordion. It is open-and-close behaviour that the
 * platform already implements correctly: keyboard operable, announced properly,
 * searchable by the browser's find-in-page even while collapsed, and it works
 * with JavaScript disabled. A custom disclosure would be more code for less
 * accessibility.
 */

type Faq = { question: string; answer: string }

const FAQS: readonly Faq[] = [
  {
    question: 'What do you build?',
    answer:
      'AI-assisted systems, automation pipelines, and full-stack applications — recipe costing and operations, document extraction, examination platforms. The through-line is operational work that was being done by hand.',
  },
  {
    question: 'Do you work with existing systems?',
    answer:
      'Yes, and most of the work is exactly that. The feedback pipeline runs on Google Workspace and Sheets a business already used; the costing platform replaced spreadsheets rather than asking anyone to abandon them mid-service.',
  },
  {
    question: 'Do you build complete products?',
    answer:
      'Yes — architecture, database schema and row-level security, application, authentication and deployment. Food Metrics and the examination platform were both built end to end rather than assembled from a template.',
  },
]

export function FaqSection() {
  const { data: profile } = useProfile()
  const { data: settings } = useSettings()

  /*
   * The availability answer is LIVE, not written into this file.
   *
   * `available_for_work` is a real boolean on the profile and the label is a
   * real settings string, so this answer changes when Moin changes it in the
   * admin rather than when someone remembers to edit a component. If no label
   * has been set the question simply does not appear — an availability answer
   * that has gone stale is worse than one that is absent.
   */
  const availabilityLabel = settings?.availabilityLabel
  const availability: Faq | null = availabilityLabel
    ? {
        question: 'Are you available for work?',
        answer: profile?.availableForWork
          ? `${availabilityLabel} The quickest way to start is to describe the process you want removed.`
          : availabilityLabel,
      }
    : null

  const items = availability ? [...FAQS, availability] : FAQS

  return (
    <Section id="faq" labelledBy="faq-heading">
      <SectionHeading
        id="faq-heading"
        eyebrow="FAQ"
        meta="COMMON_QUESTIONS"
        title="Got any questions?"
      />

      {/*
       * A plain list of <details>, NOT a <dl>.
       *
       * The first version nested <details> inside <dl> with <dt> in the
       * <summary>, and axe was right to flag it: a <dl> may only contain
       * <dt>, <dd> or a <div> holding them, so wrapping a disclosure widget
       * broke the definition-list semantics it was trying to claim. The
       * question is already a heading and the disclosure already announces its
       * expanded state, so the list adds nothing except an invalid structure.
       */}
      {/*
       * THE REFERENCE'S ACCORDION ANATOMY, measured live at 1440x900:
       *
       *   panels    `.faq-toggle` rows on FILLED panels — bg
       *             rgba(223,222,206,0.8), radius 9.94px, no border — not the
       *             hairline-divided full-width rows this section used to be
       *   question  19.01px/500 (our --text-lg lands on exactly 19 at 1440),
       *             normal tracking
       *   padding   18px 24px; rows 68px closed with 8px between them
       *   columns   TWO independent 553px columns from desktop up, eight
       *             questions split four and four
       *   icon      a 32px square, radius 6px, holding a + that becomes a −
       *   answer    16.99px, expanding inside the panel
       *
       * `items-start` is load-bearing: <details> grows when opened, and in a
       * grid without it the open panel stretches its row partner to match —
       * the reference's columns move independently.
       *
       * Four questions against the reference's eight: the count follows the
       * truthful answers, as the note above records. The rhythm — panel, gap,
       * two columns — is the reference's.
       */}
      {/* `mt-[--section-gap]` is dead (Tailwind v4 drops bare bracket custom
          properties) and computes 0. IT SHOULD STAY DEAD — measured, not
          deferred.

          The separation above this grid is already supplied by the heading
          block's own `mb-8 md:mb-12`, and it measures 48px from md up and 32px
          on a phone — identical to capabilities, process, impact and skills,
          which all take their spacing from the same SectionHeading margin.
          This utility is redundant with that margin, not missing beside it.

          Correcting it would ADD --section-gap on top of the margin, taking
          this one section to 86.64-98.08px on desktop and 64px on mobile while
          every sibling stays at 48/32 — it would create the mismatch, not fix
          one. (`--section-gap` has no live consumer anywhere in the codebase;
          its only other use is the unreferenced ProjectPlate.) */}
      <div className="mt-[--section-gap] grid items-start gap-2 lg:grid-cols-2">
        {items.map((faq) => (
          <div key={faq.question} className="bg-surface rounded-[10px]">
            <details className="group">
              <summary
                className={[
                  'text-primary flex cursor-pointer items-center justify-between gap-6',
                  'px-6 py-[18px] text-[length:var(--text-lg)] leading-(--leading-snug) font-medium',
                  'hover:text-accent transition-colors duration-(--duration-hover) ease-(--ease-reference)',
                  'marker:content-[""] [&::-webkit-details-marker]:hidden',
                ].join(' ')}
              >
                <h3 className="font-display text-[length:var(--text-lg)] font-medium">
                  {faq.question}
                </h3>

                {/*
                 * The reference's icon: + in a 32px rounded-6px square that
                 * reads − when open. Built from the same hairline rules as
                 * before — no icon import — with the square picking up a
                 * light fill in the open state exactly as the reference's
                 * does. `motion-reduce` stops the rotation.
                 */}
                <span
                  aria-hidden="true"
                  className="group-open:bg-base/80 relative grid size-8 shrink-0 place-items-center rounded-[6px] transition-colors duration-(--duration-hover)"
                >
                  <span className="bg-strong absolute h-px w-4" />
                  <span className="bg-strong absolute h-px w-4 rotate-90 transition-transform duration-(--duration-hover) ease-(--ease-reference) group-open:rotate-0 motion-reduce:transition-none" />
                </span>
              </summary>

              <p className="text-secondary max-w-[62ch] px-6 pb-6 text-[length:var(--text-base)] leading-[1.55]">
                {faq.answer}
              </p>
            </details>
          </div>
        ))}
      </div>
    </Section>
  )
}
