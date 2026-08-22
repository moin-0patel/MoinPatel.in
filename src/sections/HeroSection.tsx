import { ArrowRight, Download, Mail } from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'

import { BRAND_ICONS } from '@/components/ui/brandIcons'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useProfile, usePublishedResume, useSettings, useSocialLinks } from '@/hooks/useSiteContent'
import { cn } from '@/lib/cn'
import { imageSizes, publicStorageUrl } from '@/lib/storage'
import { HERO_FALLBACK } from '@/content/hero'
import type { SocialLink } from '@/types/domain'

/**
 * Hero — PRD 12.12 (FR-HOME-02).
 *
 * Under five seconds: who he is, what he does, why it matters commercially,
 * where to go next.
 *
 * Empty states are not edge cases here, they are the current state: the photo
 * (Q-04) and the bio (Q-12) do not exist yet. No avatar renders a monogram
 * tile, never a broken image. No published resume hides the Resume CTA
 * entirely rather than showing a dead button (FR-RES-06). No availability
 * label hides the pill (Q-20).
 */

/**
 * `social_links.icon_key` resolves here (23.13). Brand marks come from the
 * local registry; `mail` is a UI icon, so lucide supplies it.
 */
const SOCIAL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  ...BRAND_ICONS,
  mail: Mail,
  email: Mail,
}

export function HeroSection() {
  const { data: profile, isPending: profilePending } = useProfile()
  const { data: settings } = useSettings()
  const { data: socialLinks } = useSocialLinks()
  const { data: resume, isPending: resumePending } = usePublishedResume()

  /*
   * 12.12 "Loading": the identity copy is server-independent, so it falls back
   * to constants until the query resolves rather than showing a spinner in the
   * hero. The database value wins the moment it arrives.
   */
  const fullName = profile?.fullName ?? HERO_FALLBACK.fullName
  const roleTitle = profile?.roleTitle ?? HERO_FALLBACK.roleTitle
  const positioningLine = profile?.positioningLine ?? HERO_FALLBACK.positioningLine
  const location = profile?.location ?? HERO_FALLBACK.location

  const avatarUrl = publicStorageUrl('profile', profile?.avatarPath ?? null)
  const heroSocials = (socialLinks ?? []).filter((link) => link.showInHero)
  const availabilityLabel = settings?.availabilityLabel
  const showAvailability = Boolean(profile?.availableForWork && availabilityLabel)

  // 12.12 "Interactions": on Home the primary CTA scrolls to the featured
  // projects; the nav's Projects link is the one that leaves the page.
  return (
    <section
      aria-labelledby="hero-heading"
      // Chapter 01 — motion spec section 10. Without it the scroll hook cannot
      // report the hero as the active chapter, which is what reduced motion
      // uses to pick a state.
      data-chapter="hero"
      className="container-page relative flex min-h-[80vh] items-center py-16 xl:min-h-[88vh]"
    >
      {/*
       * The scrim between the 3D scene and this text. `relative` on the section
       * above is what it positions against.
       *
       * aria-hidden and pointer-events-none: it carries nothing and must never
       * intercept a click meant for a CTA. See the `hero-scrim` utility in
       * globals.css for why it is a gradient and why it lives here rather than
       * on the fixed scene layer.
       */}
      <div aria-hidden="true" className="hero-scrim" />

      {/*
       * `3fr_2fr`, not `60%_40%` — the ratio is identical (3/5 and 2/5) but the
       * unit matters. Percentage tracks resolve against the full content box
       * and the gap is then added on top, so `60% + 40% + gap` overflowed the
       * container by exactly the gap on every `lg` width. It was invisible at
       * >= 1440 only because container-page caps at 1280 and the leftover
       * margin absorbed it; at 1280 and 1024 there is no slack and the page
       * scrolled horizontally (RES-12). `fr` distributes what remains AFTER
       * gaps, which is the whole point of the unit.
       */}
      <div className="grid w-full items-center gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16">
        {/* RES-02 — on mobile the photo comes first in source order; `order`
            flips it back on desktop without changing the DOM order that
            keyboard and screen-reader users follow. */}
        <div className="order-2 lg:order-1">
          {/*
           * The design opens with a pill-shaped status chip carrying a mono
           * uppercase label and a live dot. That treatment is applied to the
           * REAL role title rather than the mockup's invented
           * "AI + AUTOMATION | BUILDING SYSTEMS THAT MATTER" string.
           *
           * `border-strong` rather than the design's `glass-panel`: PRD 32.3
           * restricts glass to the sticky header and the mobile nav sheet,
           * "nowhere else". At this size a solid surface is visually equivalent.
           */}
          <p className="border-strong bg-surface text-accent inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 font-mono text-xs tracking-[--tracking-mono] uppercase">
            <span className="bg-accent size-1.5 shrink-0 rounded-full" aria-hidden="true" />
            {roleTitle}
          </p>

          {showAvailability && (
            <p className="border-success/30 bg-success-soft text-success mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
              <span className="bg-success size-1.5 rounded-full" aria-hidden="true" />
              {availabilityLabel}
            </p>
          )}

          {/*
           * A11Y-02 — the page's single h1, and it stays the owner's name.
           *
           * The design puts its headline in an <h2> and drops the name from the
           * hero entirely. That is not adopted: PRD 12.12 fixes the name as the
           * h1 and the positioning line as a <p>, "never a heading". The visual
           * hierarchy the design wants is still achieved — the positioning line
           * below is far larger — which is exactly the split 12.12 describes.
           */}
          <h1
            id="hero-heading"
            className="text-secondary font-display mt-6 text-lg font-medium tracking-[0.02em]"
          >
            {fullName}
          </h1>

          {/*
           * The positioning line carries the design's display-xl headline
           * treatment: the largest type on the page, with a gradient fill.
           *
           * The gradient endpoints are NOT the design's. It ran
           * primary (#c3c0ff, 10.89:1) → primary-container (#4f46e5, 2.96:1),
           * so the tail of the text fell under the 4.5:1 AA floor. This runs
           * --color-primary → --color-accent instead: 14.43:1 → 10.89:1, the
           * same lavender direction with no dip. `text-primary` is set first so
           * the text stays visible if background-clip:text is unsupported.
           *
           * Uses the TOKEN utilities (from-primary / to-accent), not
           * from-[--color-primary]. The bracket form does not resolve a bare
           * custom property in Tailwind v4 — it compiled to rgba(0,0,0,0), and
           * combined with text-transparent the entire headline rendered
           * invisible while verify:ui still reported 100/100.
           */}
          <p className="text-primary font-display mt-4 bg-gradient-to-br from-primary to-accent bg-clip-text text-3xl leading-[1.1] font-semibold text-balance text-transparent md:text-4xl lg:text-5xl">
            {positioningLine}
          </p>

          {/* Q-12 — no invented bio. The paragraph simply does not render
              until Moin supplies his own words. */}
          {profilePending ? (
            <div className="mt-5 space-y-2">
              <Skeleton className="h-[1lh] w-full max-w-lg" />
              <Skeleton className="h-[1lh] w-3/5 max-w-lg" />
            </div>
          ) : (
            /* The design rules the supporting paragraph off with a left border
               in the accent hue — the one place it uses a rule as emphasis. */
            profile?.tagline && (
              <p className="text-secondary measure border-accent/30 mt-6 border-l py-1 pl-4">
                {profile.tagline}
              </p>
            )
          )}

          {location && <p className="text-muted mt-4 text-sm">{location}</p>}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button size="lg" asChild>
              <a href="#featured-projects">
                View My Work
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </Button>

            <Button size="lg" variant="secondary" asChild>
              <Link to="/contact">Let&rsquo;s Talk</Link>
            </Button>

            {/*
             * FR-RES-06 — the CTA is hidden, not disabled, when no resume is
             * published. While the query is in flight nothing renders either:
             * showing it and removing it later is the layout shift PERF-03
             * forbids.
             */}
            {!resumePending && resume && settings?.navResumeVisible !== false && (
              <Button size="lg" variant="ghost" asChild>
                <Link to="/resume">
                  <Download className="size-4" aria-hidden="true" />
                  Download Resume
                </Link>
              </Button>
            )}
          </div>

          {heroSocials.length > 0 && (
            <ul className="mt-8 flex items-center gap-2">
              {heroSocials.map((link) => (
                <li key={link.id}>
                  <SocialIconLink link={link} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
          <HeroPortrait
            url={avatarUrl}
            alt={profile?.avatarAlt ?? fullName}
            initials={initialsOf(fullName)}
          />
        </div>
      </div>
    </section>
  )
}

/**
 * 12.12 "Empty states": no avatar renders a monogram tile with the accent
 * ring — never a broken image icon. Dimensions are identical in both branches
 * so the swap costs no layout shift (PERF-03).
 */
function HeroPortrait({
  url,
  alt,
  initials,
}: {
  url: string | null
  alt: string
  initials: string
}) {
  const frame = cn(
    'relative aspect-square w-40 overflow-hidden rounded-[--radius-xl]',
    'ring-accent/25 ring-2 ring-offset-4 ring-offset-[--color-base]',
    'sm:w-52 md:w-72 lg:w-[360px] xl:w-[420px]',
  )

  /*
   * The 3D scene frames itself on this element — see CoreFraming in Scene.tsx.
   *
   * An anchor rather than hard-coded breakpoint offsets: the portrait is the
   * one thing in the hero that is already positioned correctly at every width
   * by FR-HOME-02's own responsive table (right column above 1024px, centred
   * above the text below it). Measuring it gives the Core the same answer for
   * free, and it cannot drift out of step with a layout change the way a list
   * of magic percentages would.
   */
  const anchor = { 'data-hero-anchor': '' }

  if (!url) {
    return (
      <div {...anchor} className={cn(frame, 'bg-surface-raised grid place-items-center')}>
        <span
          aria-hidden="true"
          className="text-muted font-display text-5xl font-semibold tracking-tight md:text-7xl"
        >
          {initials}
        </span>
        <span className="visually-hidden">{alt}</span>
      </div>
    )
  }

  return (
    <div {...anchor} className={frame}>
      <img
        src={url}
        alt={alt}
        // PERF-07 — the hero image is the LCP element and the only one that
        // gets fetch priority. Everything else lazy-loads.
        fetchPriority="high"
        decoding="async"
        sizes={imageSizes('hero')}
        className="size-full object-cover"
      />
    </div>
  )
}

function SocialIconLink({ link }: { link: SocialLink }) {
  const Icon = SOCIAL_ICONS[link.iconKey] ?? Mail
  const isExternal = link.url.startsWith('http')

  return (
    <a
      href={link.url}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      // A11Y-13 — icon-only links carry an accessible label, and FR-NAV-06
      // requires the new-tab hint to be part of it.
      aria-label={isExternal ? `${link.label} (opens in a new tab)` : link.label}
      className={cn(
        'grid size-11 place-items-center rounded-[--radius-sm]',
        'border-subtle text-secondary border',
        'transition-colors duration-[--duration-hover] ease-[--ease-out]',
        'hover:text-accent hover:border-accent',
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </a>
  )
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
