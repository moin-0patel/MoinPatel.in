import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { useProfile, useSettings } from '@/hooks/useSiteContent'
import { cn } from '@/lib/cn'
import { HERO_FALLBACK } from '@/content/hero'

/**
 * Hero — a replica of the reference's opening composition, with Moin's content.
 *
 * The reference builds its hero from four layers, and the order is the whole
 * effect: a cream ground, an oversized accent wordmark cropped by the viewport,
 * a portrait standing in front of it, and the headline and controls arranged
 * around the figure. It is one composition, not a text column beside an image
 * column.
 *
 * WHAT REPLACED THE 3D CORE
 *
 * The Core used to be this hero's visual. It is gone from this composition —
 * measured, not preferred. On the cream ground the scene put black body text at
 * 1.18-2.25:1 against a 4.5:1 requirement across every chapter, and the
 * reference has no 3D here at all. Every file under `src/components/three/`
 * remains untouched; only its presence in this section changed.
 *
 * THE PORTRAIT IS A REAL CUT-OUT NOW
 *
 * It used to be the supplied JPEG under `mix-blend-mode: multiply`. That did
 * clear the background — measured 1-3/255 between the pixels inside and
 * outside the image box — but multiply cannot tell the background from the
 * man: it multiplied the subject by the cream ground too, and the photograph
 * rendered as a darkened duotone rather than as itself.
 *
 * `public/moin-portrait.webp` is the same photograph with a real alpha
 * channel, derived from the JPEG by `npm run assets:portrait`; that script
 * carries the measurements and the method. Every fully-opaque pixel is the
 * JPEG's own, so what renders here is Moin's actual photograph, at its actual
 * colours, with nothing behind it.
 *
 * Two things follow from the swap, and both used to be worked around here:
 * the `brightness(1.08)` that was flattening the source's baked-in
 * checkerboard is gone, and so is the ban on `z-index` that `mix-blend-mode`
 * imposed on this wrapper.
 */

export function HeroSection() {
  const { data: profile } = useProfile()
  const { data: settings } = useSettings()

  const fullName = profile?.fullName ?? HERO_FALLBACK.fullName
  const roleTitle = profile?.roleTitle ?? HERO_FALLBACK.roleTitle
  /*
   * The large statement is the TAGLINE, not the positioning line.
   *
   * The positioning line is 14 words. Set at the reference's headline size it
   * wrapped to six lines across the portrait's face — the composition inverted,
   * with the type burying the figure instead of crossing it. The reference's own
   * headline is three words for exactly this reason.
   *
   * `tagline` is an existing, admin-editable `profiles` column, currently null,
   * and it was not consumed anywhere on the public site. So the fix is a
   * content-shape change, not a layout one: the same slot, a shorter string,
   * still database-owned. The full positioning line is untouched and still
   * renders in the footer and as the page description.
   */
  const headline = profile?.tagline ?? HERO_FALLBACK.tagline
  const location = profile?.location ?? HERO_FALLBACK.location
  const availabilityLabel = settings?.availabilityLabel
  const showAvailability = Boolean(profile?.availableForWork && availabilityLabel)

  /*
   * Mode D — the reference's stat cards.
   *
   * It shows "80+ Projects" and "7+ Years of experience". No equivalent figure
   * has been verified for Moin, and inventing one is the single thing this
   * project has consistently refused. So the cards are BUILT and render nothing
   * until real values exist: this array is the seam, and filling it from
   * Supabase later needs no other change.
   *
   * Rendering zeros or a placeholder would be worse than the absence — it
   * advertises the gap rather than simply not making a claim.
   */
  const stats: { value: string; label: string }[] = []

  return (
    <section
      aria-labelledby="hero-heading"
      // Chapter 01 — the scroll hook needs this to report the hero as active.
      data-chapter="hero"
      // No overflow-hidden HERE: a clipping ancestor is the classic sticky
      // killer, and the morph scene pins the composition wrapper below. The
      // clipping the overflowing wordmark needs lives on that wrapper instead,
      // which at rest is this section's exact box.
      className="relative lg:-ml-60"
    >
      {/*
       * THE COMPOSITION WRAPPER — the element the hero-morph scene pins.
       *
       * At rest this renders byte-identically to the old single-element hero:
       * it carries the flex column and the 100svh minimum the section used to
       * own, and every absolute child anchors to it exactly as before, so the
       * boot shell in index.html still lands pixel-exact and §12.3 holds.
       *
       * When ScrollChoreography builds (motion allowed, module loaded), it adds
       * `hero-morph-scene` to the SECTION, and globals.css turns this wrapper
       * into a sticky 100svh stage inside a 250svh scene: the composition
       * holds the viewport for 1.5 extra viewport-heights of scroll while the
       * morph timeline scrubs it, and the section's -100svh bottom margin lets
       * the next section slide in over the still-present portrait. The class
       * lives on the choreography, not here, so reduced motion, prerender
       * bots, and a failed module load all keep this natural static layout —
       * the same failure contract every other beat in that module obeys.
       */}
      <div
        data-hero-composition=""
        className="relative flex min-h-[100svh] flex-col overflow-hidden"
      >
        {/*
         * LAYER 1 — the wordmark.
         *
         * A graphic element, not a heading. `aria-hidden` because the accessible
         * name is the h1 below and hearing the name twice is noise.
         *
         * `clamp` with a vw term is what makes it crop the way the reference's
         * does: it outgrows the viewport instead of reflowing, so the outer
         * glyphs run off both edges. "MOIN PATEL" is ten characters against the
         * reference's four, so the vw coefficient is necessarily lower — matching
         * its letter SIZE would push the word past three viewport widths.
         */}
        <span
          aria-hidden="true"
          // The chapter-01 handoff's parallax target (ScrollChoreography). At
          // scroll 0 the tween holds identity, so the boot-shell copy in
          // index.html still lands pixel-exact at hydration.
          data-hero-wordmark=""
          className={cn(
            // text-[color:var(...)], NOT text-[--color-accent-word]. Tailwind v4 does
            // not resolve a bare custom property in the bracket form — it compiles to
            // an invalid declaration and the element silently inherits. That is the
            // same trap that once rendered this hero's headline invisible.
            'pointer-events-none absolute inset-x-0 top-[7%] select-none text-[color:var(--color-accent-word)]',
            'font-display text-center font-bold whitespace-nowrap',
            'leading-[0.78] tracking-[-0.045em]',
            'text-[clamp(3.5rem,16vw,14rem)]',
          )}
        >
          {fullName.toUpperCase()}
        </span>

        {/*
         * LAYER 2 — the portrait, standing in front of the wordmark.
         *
         * No card, no rounded container, no shadow. The reference sets the figure
         * directly on the ground, and a frame around it would be the clearest
         * single tell that this is a portfolio template rather than the
         * composition being replicated.
         */}
        {/*
         * Layering is DOM order, and that is all it needs to be. The wordmark is
         * painted before this, the content block after it, and nothing here
         * creates a stacking context — so the figure stands in front of "MOIN
         * PATEL" and behind the headline without a single z-index.
         */}
        <div
          // Chapter-01 parallax target — the WRAPPER, not the img: the figure's
          // own transform pipeline (portrait-matte, height rules) stays
          // untouched, and useHeroFraming reads on resize only, so a
          // scroll-time transform here never feeds back into the Core framing.
          data-hero-figure=""
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center"
        >
          <img
            src="/moin-portrait.webp"
            alt={`${fullName}, ${roleTitle}`}
            // The LCP element, and the only image on the page given priority.
            fetchPriority="high"
            decoding="async"
            className={cn(
              // No `max-w-none` here — it does not work. The base `img` rule that
              // caps media at 100% is unlayered and beats Tailwind's utilities
              // layer, so the escape is written next to that rule in globals.css.
              'w-auto shrink-0 object-contain object-bottom',
              /*
               * SIZED BY THE HEAD, matched to the reference at each width.
               *
               * The head is 41.8% of this photograph's height (hairline y=110,
               * chin y=715, of 1448). The reference sets its own head to 38% of
               * the viewport at 1440x900 and to 21.6% at 390x844 — it does not
               * scale the figure linearly, it holds a portrait crop on desktop
               * and lets the body fill the column on a phone.
               *
               * Dividing through gives 91svh on desktop, and that is what the
               * figure is set to. It was at 72svh — a 30% head — which is the
               * single biggest reason this composition read as a photo on a page
               * rather than as the reference's hero, where the man IS the
               * composition.
               *
               * The same arithmetic asks for 52svh on a phone and it is NOT used,
               * because the two photographs are not the same crop. The
               * reference's figure carries a half body: its head is a quarter of
               * the visible figure and the torso fills the column to the bottom
               * edge. This one is head-and-shoulders — the head is 42% of the
               * frame — so 52svh reproduces the reference's HEAD and loses its
               * composition, leaving 260px of empty ground between the wordmark
               * and the hair. 80svh is where the figure fills the column the way
               * the reference's does, which is the thing being replicated.
               */
              'h-[80svh] lg:h-[91svh]',
              // The last few pixels — see the utility, which carries the geometry.
              'portrait-matte',
              /*
               * NO AMBIENT ZOOM HERE, and that is a measured decision rather
               * than an omission — see the retired `portrait-zoom` note in
               * globals.css. The reference's portrait does not animate: its
               * wrapper carries a STATIC scale(1.0372) with
               * `animation-name: none`, which an earlier audit misread as a slow
               * zoom by sampling two nested static scales. Implementing it as an
               * animation also pushed LCP from ~750ms to ~2.6s, past the §12.4
               * floor, because a scaling hero image registers a second, larger
               * largest-contentful-paint entry.
               */
            )}
          />
        </div>

        {/*
         * LAYER 3 — the content, arranged around the figure.
         *
         * `mt-auto` pins this to the lower band of the viewport the way the
         * reference does, so the headline crosses the figure rather than floating
         * in the middle of the screen.
         */}
        <div className="container-page relative mt-auto w-full pb-10 lg:pb-14">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            {/* Left band — where the reference places its stat cards. */}
            <div className="order-2 flex flex-col gap-3 lg:order-1 lg:w-[15rem]">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="border-subtle bg-surface/70 flex items-baseline gap-3 border px-4 py-3"
                >
                  <span className="text-accent font-display text-[length:var(--text-3xl)] leading-none font-bold">
                    {stat.value}
                  </span>
                  <span className="text-secondary font-mono text-xs tracking-(--tracking-mono) uppercase">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Centre band — identity, role, controls. */}
            <div className="order-1 flex max-w-[34rem] flex-col items-start lg:order-2 lg:items-center lg:text-center">
              {/*
               * THE IDENTITY PLATE.
               *
               * The reference sets its small text over the figure on translucent
               * panels — the stat cards lower left, the trait list right — for the
               * same reason we need one here: a photograph is not a background you
               * can set 13px type on and predict. This is that treatment, at the
               * one place our composition puts small text on the figure.
               *
               * It is tinted with `--glass-bg`, which is the page ground at 82%,
               * and that single fact is what makes it work at every width without
               * a breakpoint or a colour switch:
               *
               *   over the black shirt (desktop) it lifts the local backdrop to
               *   rgb(175,170,156), and the dark type on it measures ~6-9:1;
               *
               *   over the cream ground it is cream on cream and vanishes — no
               *   box, no edge, nothing to see.
               *
               * At the narrow widths the plate straddles both, and it simply
               * fades across: solid where it crosses the hair, gone where it sits
               * on the ground. So the panel is present in proportion to how much
               * it is needed, with no breakpoint and no colour switch anywhere —
               * which is the reference's own behaviour rather than a rule we
               * imposed on top of it.
               *
               * Measured worst case across all six viewports, sampling the
               * darkest photo pixel under the plate: 9.02:1 for the name, 6.08:1
               * for the role.
               *
               * Square, not rounded, and sized to the two lines it carries: it is
               * a text plate, not a card. `w-fit` keeps it shrink-wrapped at
               * `items-start` and at `lg:items-center` alike.
               */}
              <div
                // Chapter-01 recede target: spec §4 ch01 has the name and role
                // fading to 0.15 and drifting -30px as the reader scrolls into
                // the statement — "the one place text recedes".
                data-hero-recede=""
                className="w-fit px-3 py-2 [background-color:var(--glass-bg)]"
              >
                {/*
                 * A11Y-02 / PRD 12.12 — the page's single h1, and it stays the
                 * name. The reference's own brand name is its wordmark; this is
                 * the accessible equivalent, set small because the wordmark above
                 * already carries the visual weight.
                 */}
                <h1
                  id="hero-heading"
                  className="text-primary font-mono text-xs tracking-[0.22em] uppercase"
                >
                  {fullName}
                </h1>

                {/*
                 * The role, as metadata — not the headline.
                 *
                 * It had the display treatment, which left the hero with no
                 * headline at all: the statement line was not rendered, and the
                 * audit measured this hero's only heading at 13px against the
                 * reference's 76px.
                 *
                 * It reads dark now rather than near-white, because it sits on
                 * the plate with the name. Near-white was legible over the shirt
                 * at desktop and invisible over the cream at mobile, where the
                 * block clears the figure entirely — the plate removes that split
                 * instead of papering over it.
                 */}
                <p className="text-secondary mt-1 font-mono text-xs tracking-(--tracking-mono) uppercase">
                  {roleTitle}
                </p>
              </div>

              {/*
               * THE HEADLINE — the tagline, and it stays a <p>.
               *
               * PRD 12.12 is explicit on both halves: the name is the single h1,
               * and the statement line is "never a heading". So the visual
               * hierarchy the reference wants is achieved with type rather than
               * with markup — this carries the display weight while the h1 above
               * stays the accessible name. Changing the h1 to match the
               * reference's markup would break 12.12 and A11Y-02.
               *
               * #f8f7f3 is the reference's own measured headline colour, set over
               * the figure exactly as it sets it.
               */}
              <p
                data-hero-headline=""
                className="font-display mt-3 text-[length:var(--text-4xl)] leading-[0.98] font-bold tracking-[-0.03em] text-balance text-[#f8f7f3] lg:text-[length:var(--text-5xl)]"
              >
                {headline}
              </p>

              {/*
               * Pill CTAs, matching the reference's treatment. The primary
               * destination is Moin's real contact route — no booking account is
               * invented.
               */}
              <div
                data-hero-ctas=""
                className="mt-7 flex flex-wrap items-center gap-3 lg:justify-center"
              >
                <Button size="lg" asChild className="rounded-full">
                  <Link to="/contact">Let&rsquo;s Talk</Link>
                </Button>

                <Button size="lg" variant="secondary" asChild className="rounded-full">
                  <a href="#featured-projects">View My Work</a>
                </Button>
              </div>
            </div>

            {/* Right band — where the reference runs its short trait list. */}
            <div data-hero-aside="" className="order-3 flex flex-col lg:w-[15rem] lg:items-end">
              {/*
               * THE SAME PLATE THE IDENTITY BLOCK USES, and for the same reason.
               *
               * At 390x844 and 375x812 this line sits at the very bottom of the
               * column, which is where the figure is at its widest — the location
               * rendered as #2e2b22 on the black shirt and effectively vanished.
               * At 1440 it clears the figure entirely and sits on cream.
               *
               * That is one problem with two appearances, and the reference's own
               * answer to it is already in this file: a `--glass-bg` panel, the
               * page ground at 82%. Over the shirt it lifts the local backdrop to
               * rgb(175,170,156) and the type measures 6.0:1; over the cream it is
               * cream on cream and there is nothing to see. Where the plate
               * straddles both it fades across.
               *
               * So no breakpoint, no second colour, and no `lg:text-*` override —
               * the same treatment resolves both ends by itself, which is what
               * the H1 fix established as this hero's way of handling text over
               * the figure.
               *
               * `w-fit` shrink-wraps it at `items-start` and at `lg:items-end`
               * alike, so it never draws a full-width band across the cream.
               */}
              <div className="flex w-fit flex-col gap-2 px-3 py-2 [background-color:var(--glass-bg)]">
                <p className="text-secondary font-mono text-xs tracking-(--tracking-mono) uppercase">
                  {location}
                </p>

                {showAvailability && (
                  <p className="text-success inline-flex items-center gap-2 font-mono text-xs tracking-(--tracking-mono) uppercase">
                    <span
                      className="bg-success size-1.5 shrink-0 rounded-full"
                      aria-hidden="true"
                    />
                    {availabilityLabel}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
