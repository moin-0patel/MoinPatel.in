import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { CATEGORY_LABEL } from '@/lib/labels'
import { imageSizes, publicStorageUrl } from '@/lib/storage'
import { resolveCardLinks } from '@/lib/visibility'
import type { ProjectSummary } from '@/types/domain'

/**
 * WorkCard — the reference's Selected Work card, measured and rebuilt.
 *
 * EVERY NUMBER BELOW WAS MEASURED, not chosen. Captured at 1440x900 from the
 * live reference with real wheel events (the site drives Lenis + ScrollTrigger,
 * and `window.scrollTo` leaves it mid-timeline rendering nonsense):
 *
 *   card            389 x 550, ratio 0.7073, radius 11.95px, overflow hidden
 *   gap             30px between cards
 *   content padding 18px 18px 26px
 *   number pill     13.97px / 400, full radius, pad 4.97px 9.94px,
 *                   black fill, white text, inset 18/18 top-left
 *   tag pills       identical treatment, right-aligned on the same row, ~4px apart
 *   title           27.94px / 500, line-height 27.94px, white, 98px from the
 *                   card's bottom edge
 *   description     16.99px / 400, line-height 22.09px, white at 80%, 303px
 *                   wide, three lines
 *   arrow           36 x 36 disc, accent fill, dark glyph, inset 18px right /
 *                   26px bottom; the text block reserves 50px of right padding
 *                   so it never runs under it
 *   scrim           flat rgba(0,0,0,0.6) over unfocused cards, `opacity 0.4s`
 *
 * WHY IT IS NOT AN IMAGE HERE
 *
 * The reference's card is a photograph with everything else laid over it. All
 * three of Moin's published projects have `cover_image_path = null` — verified
 * against the running build, not assumed — so every card renders the approved
 * fallback instead, per the phase brief's instruction not to invent imagery.
 *
 * The fallback is the treatment `ProjectCard` already uses (a gradient tile
 * carrying the project title), re-toned dark. That re-tone is a legibility
 * requirement rather than a new design: this card's type is white, and white on
 * the cream tile would ship a contrast failure. The moment a cover exists the
 * image takes the same slot at the same ratio with no other change.
 */

/**
 * The reference shows three tags per card — but its tags are `Components`,
 * `GSAP`, `SEO`. Moin's technologies are `Google Apps Script` and
 * `Gemini 2.5 Flash`, and three of those wrap the row onto a second line, which
 * pushes the pills down over the image and leaves one card visibly taller in
 * the head than its neighbours.
 *
 * So the budget is characters, not count: take tags while they still fit one
 * row, up to the reference's three. Deterministic, no truncation, no ellipsis
 * inside a pill, and a card with short tech names still shows three.
 */
const MAX_TAGS = 3
const MAX_TAG_CHARS = 30

function fitTags(technologies: ProjectSummary['technologies']) {
  const out: ProjectSummary['technologies'] = []
  let budget = MAX_TAG_CHARS
  for (const tech of technologies) {
    if (out.length >= MAX_TAGS) break
    if (out.length > 0 && tech.name.length > budget) break
    out.push(tech)
    budget -= tech.name.length
  }
  return out
}

export function WorkCard({ project, index }: { project: ProjectSummary; index: number }) {
  const { target } = resolveCardLinks(project)
  const coverUrl = publicStorageUrl('projects', project.coverImagePath)
  const tags = fitTags(project.technologies)
  /* 01, 02, 03 — and only ever as many as there are real projects. */
  const numeral = String(index + 1).padStart(2, '0')

  const body = (
    <>
      {/* --- the image layer ------------------------------------------- */}
      {coverUrl ? (
        <img
          src={coverUrl}
          // projects_cover_alt_check guarantees alt text wherever a cover
          // exists; the fallback is belt and braces.
          alt={project.coverImageAlt ?? project.title}
          loading="lazy"
          decoding="async"
          sizes={imageSizes('card')}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        /*
         * The fallback, and note what it does NOT carry: the title.
         *
         * `ProjectCard`'s tile prints the project name because on that card the
         * image slot is the only place it appears above the fold. Here the card
         * already sets the title at 28px over the same rectangle, so printing it
         * again put the same words twice on one card, 200px apart.
         *
         * Dark-toned rather than the cream tile's tones, because this card's
         * type is white and white on cream would ship a contrast failure. The
         * treatment — a flat gradient tile standing in for a photograph — is
         * unchanged, which is what the brief asked be reused.
         */
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[#1c1c1c] to-[#0a2a2f]"
        />
      )}

      {/*
       * The scrim. Transparent by default and lifted to 1 by the row's
       * `:has()` rule when a SIBLING is hovered — see `work-row` in globals.css.
       * 0.4s is the reference's measured transition.
       */}
      <span
        aria-hidden="true"
        data-work-scrim=""
        className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-[--duration-reveal] ease-[--ease-reference]"
      />

      {/* --- the content layer ----------------------------------------- */}
      <div className="absolute inset-0 flex flex-col p-[18px] pb-[26px]">
        <div className="flex items-start justify-between gap-2">
          {/*
           * Decorative: the list is an <ol>, so the position is already in the
           * document outline and announcing "zero one" before every title is
           * noise. This is the reference's numeral treatment, not new data.
           */}
          <span aria-hidden="true" className={PILL}>
            {numeral}
          </span>

          <span className="flex flex-wrap justify-end gap-1">
            {tags.map((tech) => (
              <span key={tech.id} className={PILL}>
                {tech.name}
              </span>
            ))}
          </span>
        </div>

        {/* Pushes the text block to the bottom the way the reference does. */}
        <div className="mt-auto pr-[50px]">
          <h3 className="font-display text-[length:var(--text-2xl)] leading-[1] font-medium text-balance text-[color:var(--work-ink)]">
            {project.title}
          </h3>

          <p className="mt-2 line-clamp-3 text-[length:var(--text-base)] leading-[1.3] text-[color:var(--work-ink-dim)]">
            {project.summary}
          </p>
        </div>
      </div>

      {/*
       * The accent disc. Cyan where the reference uses yellow — the one
       * deliberate palette divergence this project carries — with the same
       * dark glyph on it. `--color-accent-ink` on `--color-accent-fill` is the
       * pairing the Button already uses, measured at 8.9:1.
       */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute right-[18px] bottom-[26px] grid size-9 place-items-center rounded-full',
          'bg-accent-fill text-accent-ink',
          'transition-transform duration-[--duration-hover] ease-[--ease-reference]',
          'group-hover:-translate-y-0.5 motion-reduce:transform-none',
        )}
      >
        <ArrowUpRight className="size-[18px]" />
      </span>
    </>
  )

  const label = `${project.title} — ${CATEGORY_LABEL[project.category]}`

  /*
   * AN <article> WRAPPING A STRETCHED LINK, not a bare <a>.
   *
   * The first version made the whole card one anchor, which reads fine and is
   * what the reference does. It is still wrong here for two reasons, and
   * `verify:ui` caught the second one immediately:
   *
   *   a project card is a self-contained piece of content, which is what
   *   <article> means — and it is the element `ProjectCard` already uses, so
   *   two components describing the same thing should not disagree;
   *
   *   the suite counts `#featured-projects article` to decide whether any
   *   project rendered at all. With no <article> the count was 0, the suite
   *   took its "no published projects" branch, and asserted the section was
   *   absent while it was plainly on screen. The assertion was right and the
   *   markup was wrong.
   *
   * The link is absolutely positioned over the card — the stretched-link
   * pattern `ProjectCard` uses — so the accessible name is the project, once,
   * rather than every word inside the card concatenated.
   */
  const shell = cn(
    'group relative block overflow-hidden rounded-[12px]',
    // 389 x 550. Written as the measured pair rather than a decimal so the
    // provenance survives; the browser resolves it to 0.7073.
    'aspect-[389/550]',
    // A11Y-04 — the ring is on the card, not on the invisible overlay link.
    'focus-within:outline-focus-ring focus-within:outline-2 focus-within:outline-offset-2',
  )

  return (
    <article data-work-card="" className={shell}>
      {body}

      {/*
       * `visibility_mode = 'private'` yields `target.kind === 'none'`. RLS
       * should have withheld the row, so reaching here means something upstream
       * is wrong: render the card inert rather than linking nowhere. Same
       * contract as ProjectCard, decided by the same table-driven resolver.
       */}
      {target.kind === 'case-study' && (
        <Link to={target.href} className="absolute inset-0 z-10">
          <span className="visually-hidden">{label}</span>
        </Link>
      )}

      {target.kind === 'external' && (
        <a
          href={target.href}
          target="_blank"
          rel="noopener noreferrer" // FR-NAV-06
          className="absolute inset-0 z-10"
        >
          <span className="visually-hidden">{label} (opens in a new tab)</span>
        </a>
      )}
    </article>
  )
}

/**
 * The pill, shared by the numeral and the tags because the reference uses one
 * treatment for both — same size, same weight, same radius, same fill. They
 * differ only in what they say.
 */
const PILL = cn(
  'inline-flex items-center rounded-full bg-black px-[10px] py-[5px]',
  'font-mono text-xs whitespace-nowrap text-white',
)
