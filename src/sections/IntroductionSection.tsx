import { Chapter, ChapterNumber } from '@/components/common/Chapter'

/**
 * Chapter 02 — Introduction, spec §8.
 *
 * Four statements that read as one sentence broken across lines:
 *
 *   I BUILD / INTELLIGENT SYSTEMS / THAT TURN MANUAL WORK / INTO AUTOMATION.
 *
 * PHASE 1 SCOPE. The spec asks for these to appear progressively, scrubbed
 * against scroll with GSAP ScrollTrigger. That is Phase 4. Here they are simply
 * present and readable, because a phase that ships text nobody can read until
 * the animation lands is not verifiable.
 *
 * `data-line` is the contract Phase 4 animates against — established now while
 * the markup is static, so that phase only adds a timeline.
 *
 * The lines are static copy, not database content: they are the narrative
 * device of the page rather than editable prose, in the same way the section
 * eyebrows are. The one thing that IS from the database is the positioning
 * line, which the hero already carries — this chapter deliberately does not
 * repeat it.
 *
 * A11Y: one <h2> holds the whole sentence so the document outline reads
 * correctly and a screen reader announces it once, as a sentence. The visual
 * line breaks are <span>s inside it, not separate headings — four headings
 * would fragment one thought into four for anyone not looking at the screen.
 */

const LINES = ['I build', 'intelligent systems', 'that turn manual work', 'into automation.']

export function IntroductionSection() {
  return (
    <Chapter id="introduction" labelledBy="introduction-heading">
      <div className="flex items-start gap-4 md:gap-8">
        <ChapterNumber id="introduction" className="mt-3 shrink-0 md:mt-5" />

        <h2
          id="introduction-heading"
          /*
           * Weight 500, matching every other section heading and the measured
           * reference. This was semibold — the only display heading on the page
           * still a step heavier, because it predates the shared primitive.
           *
           * It keeps its own markup rather than adopting `SectionHeading`: the
           * four statement lines are <span>s inside one h2 so the sentence is
           * announced once, and that structure is the point of the section.
           */
          className="text-primary font-display text-[length:var(--text-3xl)] leading-[1.05] font-medium tracking-[-0.03em] text-balance md:text-[length:var(--text-4xl)] lg:text-[length:var(--text-5xl)]"
        >
          {LINES.map((line, index) => (
            <span
              key={line}
              data-line={index}
              /*
               * `block` so each phrase owns a line at every width, which is the
               * composition the spec asks for. The last line takes the accent
               * so the sentence resolves on the word that matters.
               */
              className={index === LINES.length - 1 ? 'text-accent block' : 'block'}
            >
              {line}
            </span>
          ))}
        </h2>
      </div>
    </Chapter>
  )
}
