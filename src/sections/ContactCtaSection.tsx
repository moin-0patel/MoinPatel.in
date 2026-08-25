import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { useProfile, useSettings } from '@/hooks/useSiteContent'
import { cn } from '@/lib/cn'

/**
 * Contact CTA band — PRD 12.10.
 *
 * The conversion point. One primary action per viewport (8.4), and the label
 * is "Let's Talk" here exactly as it is in the header and the hero — the same
 * action keeps the same label everywhere.
 *
 * The response-time line comes from `site_settings.contact_response_note` and
 * is NULL until Q-19 is answered. Null hides the line rather than promising a
 * turnaround nobody has agreed to; an unmet "within 24 hours" on a portfolio
 * costs more than saying nothing.
 */
export function ContactCtaSection() {
  const { data: profile } = useProfile()
  const { data: settings } = useSettings()

  const email = profile?.emailPublic
  const responseNote = settings?.contactResponseNote

  return (
    <section
      aria-labelledby="contact-cta-heading"
      // Chapter 07 of the narrative — motion spec section 10. The hook only;
      // the section's own layout is untouched.
      data-chapter="contact"
      className="container-page py-12 md:py-20"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-[--radius-xl] px-6 py-14 text-center md:px-12',
          'border-subtle border',
          // 32.1 — gradients appear in the CTA band and the process-line motif
          // only, single direction, low opacity.
          /*
           * THE INDIGO IS GONE. `--color-indigo-deep` (#1d00a5) anchored this
           * gradient and was the last survivor of the pre-inversion palette —
           * a second accent hue on a site whose token file calls a second
           * accent "a design regression" in as many words. The band now runs
           * inside the one hue family it is allowed: a low-opacity cyan wash
           * over the panel surface, falling to the page ground.
           *
           * `accent-soft` rather than `accent-fill`, because this is a large
           * area behind black type. The bright cyan is a 1.5:1 foreground and
           * is only ever a small FILL under dark ink; at band size it would
           * take the heading to roughly that ratio.
           *
           * `bg-surface` UNDER the gradient, and that stays a contrast fix.
           * The stops are translucent, so without a solid colour beneath, the
           * band composites against whatever is behind it rather than against
           * a known surface. It is the reason "Email me" once measured 4.18:1.
           *
           * Written as an arbitrary property, NOT `bg-surface`. `cn()` runs
           * tailwind-merge, which groups `bg-surface` and `bg-gradient-to-br`
           * as conflicting background utilities and keeps only the last one —
           * so `bg-surface` was silently dropped from the class list. The
           * utility was present in the CSS bundle and absent from the element,
           * which is why the first two attempts at this fix changed nothing.
           * Do not "tidy" it back into `bg-surface`.
           */
          '[background-color:var(--color-surface)] from-accent-soft to-base bg-gradient-to-br via-[--color-surface]',
        )}
      >
        {/*
         * Matched to the shared section scale — 68px / weight 500 at 1440.
         *
         * This heading was the last on the page still at 38px/600, because it
         * hand-rolls its own h2 instead of routing through `SectionHeading`.
         * The measured reference sets every section heading at 65.95px/500, and
         * the closing statement is the worst place to be a step smaller.
         *
         * It stays a bare h2 rather than adopting `SectionHeading` wholesale:
         * that component renders an eyebrow, a hairline rule and a right-hand
         * meta label, and this section is a centred CTA band with none of them.
         * Only the type scale needed to agree.
         */}
        <h2
          id="contact-cta-heading"
          className="text-primary font-display text-[length:var(--text-3xl)] leading-[1.05] font-medium text-balance md:text-[length:var(--text-4xl)] lg:text-[length:var(--text-5xl)]"
        >
          Have a manual process worth automating?
        </h2>

        <p className="text-secondary measure mx-auto mt-4">
          Describe what your team does by hand today, and I&rsquo;ll tell you whether it can be
          replaced with a system.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" shape="pill" asChild>
            <Link to="/contact">Let&rsquo;s Talk</Link>
          </Button>

          {/* 12.10 "Empty": with no public email, only the primary CTA shows. */}
          {email && (
            <Button size="lg" variant="secondary" shape="pill" asChild>
              <a href={`mailto:${email}`}>Email me</a>
            </Button>
          )}
        </div>

        {/* Q-19. Hidden until Moin states a response time. */}
        {responseNote && <p className="text-muted mt-6 text-sm">{responseNote}</p>}
      </div>
    </section>
  )
}
