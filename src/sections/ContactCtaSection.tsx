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
           * `bg-surface` UNDER the gradient, and that is a contrast fix.
           *
           * The gradient's first stop is `indigo-deep/40` — 40% alpha — so the
           * 3D scene showed straight through the card and the actions
           * composited against the lit Core rather than against the card. At
           * 390px "Email me" measured 4.18:1 on #715eac, which is the sphere.
           *
           * A solid colour beneath means the translucent gradient now blends
           * with a known surface instead of with whatever the scene is doing.
           * The band looks the same; it just stops being a window.
           *
           * Written as an arbitrary property, NOT `bg-surface`. `cn()` runs
           * tailwind-merge, which groups `bg-surface` and `bg-gradient-to-br`
           * as conflicting background utilities and keeps only the last one —
           * so `bg-surface` was silently dropped from the class list. The
           * utility was present in the CSS bundle and absent from the element,
           * which is why the first two attempts at this fix changed nothing.
           */
          '[background-color:var(--color-surface)] from-indigo-deep to-base bg-gradient-to-br via-[--color-surface]',
        )}
      >
        <h2 id="contact-cta-heading" className="text-primary text-balance">
          Have a manual process worth automating?
        </h2>

        <p className="text-secondary measure mx-auto mt-4">
          Describe what your team does by hand today, and I&rsquo;ll tell you whether it can be
          replaced with a system.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link to="/contact">Let&rsquo;s Talk</Link>
          </Button>

          {/* 12.10 "Empty": with no public email, only the primary CTA shows. */}
          {email && (
            <Button size="lg" variant="secondary" asChild>
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
