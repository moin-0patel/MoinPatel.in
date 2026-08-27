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
      {/*
       * AN OPEN COMPOSITION ON THE CREAM, NOT A BOXED BAND — measured, not
       * assumed. The final-phase audit put real numbers on the reference's
       * closing (#webflow_journey): a 110.02px/500 heading set left in the
       * measure, a 16.99px paragraph, a small "Have something in mind?" line,
       * and one CTA — no panel, no border, no background of its own. The
       * boxed, centered, gradient-washed band this section carried was the
       * previous design's shape, and this phase retires it.
       *
       * That also removes the last gradient below the hero. The cyan wash was
       * Phase 3's honest re-toning of an indigo box; the measurement says the
       * box itself was never the reference's.
       */}
      <div className="relative">
        {/*
         * THE DISPLAY SCALE, left-set — the reference's closing heading is its
         * page's largest text after the hero wordmark: 110.02px/500, start-
         * aligned, wrapping over three lines. --text-7xl (up to 120px) is the
         * statement step our scale reserves for exactly these moments; ours
         * wraps the same way. It stays a bare h2 — no eyebrow, no rule, no
         * meta — because the reference's closing carries none of them.
         */}
        <h2
          id="contact-cta-heading"
          className="text-primary font-display max-w-[18ch] text-[length:var(--text-4xl)] leading-[1.02] font-medium text-balance md:text-[length:var(--text-5xl)] lg:text-[length:var(--text-7xl)]"
        >
          Have a manual process worth automating?
        </h2>

        {/* 16.99px in a narrow start-aligned column, as measured. */}
        <p className="text-secondary mt-6 max-w-[26rem]">
          Describe what your team does by hand today, and I&rsquo;ll tell you whether it can be
          replaced with a system.
        </p>

        {/*
         * The reference sets a small "Have something in mind?" line above its
         * button. Ours is the response note when one exists — the same slot,
         * already database-owned (Q-19) — so nothing is invented to fill it.
         */}
        {responseNote && <p className="text-muted mt-8 text-sm">{responseNote}</p>}

        <div className={cn('flex flex-wrap gap-3', responseNote ? 'mt-3' : 'mt-8')}>
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
      </div>
    </section>
  )
}
