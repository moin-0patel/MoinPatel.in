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
      <div className="border-subtle mt-[--section-gap] border-t">
        {items.map((faq) => (
          <div key={faq.question} className="border-subtle border-b">
            <details className="group">
              <summary
                className={[
                  'text-primary font-display flex cursor-pointer items-center justify-between gap-6',
                  'py-6 text-[length:var(--text-xl)] leading-[--leading-snug] font-medium',
                  'tracking-[--tracking-tight] md:py-7 md:text-[length:var(--text-2xl)]',
                  'hover:text-accent transition-colors duration-[--duration-hover] ease-[--ease-out]',
                  'marker:content-[""] [&::-webkit-details-marker]:hidden',
                ].join(' ')}
              >
                <h3 className="font-display font-medium">{faq.question}</h3>

                {/*
                 * A rotating rule rather than a chevron icon: the same hairline
                 * vocabulary the rest of the page uses, and it needs no icon
                 * import. `motion-reduce` stops the rotation for anyone who has
                 * asked for less movement.
                 */}
                <span
                  aria-hidden="true"
                  className="relative size-4 shrink-0 self-start md:mt-2"
                >
                  <span className="bg-strong absolute top-1/2 left-0 h-px w-4" />
                  <span className="bg-strong absolute top-1/2 left-0 h-px w-4 rotate-90 transition-transform duration-[--duration-hover] ease-[--ease-out] group-open:rotate-0 motion-reduce:transition-none" />
                </span>
              </summary>

              <p className="text-secondary max-w-[62ch] pb-7 text-[length:var(--text-lg)]">
                {faq.answer}
              </p>
            </details>
          </div>
        ))}
      </div>
    </Section>
  )
}
