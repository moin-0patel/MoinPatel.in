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
      className="container-page flex min-h-[80vh] items-center py-16 xl:min-h-[88vh]"
    >
      <div className="grid w-full items-center gap-10 lg:grid-cols-[60%_40%] lg:gap-16">
        {/* RES-02 — on mobile the photo comes first in source order; `order`
            flips it back on desktop without changing the DOM order that
            keyboard and screen-reader users follow. */}
        <div className="order-2 lg:order-1">
          {showAvailability && (
            <p className="border-success/30 bg-success-soft text-success mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
              <span className="bg-success size-1.5 rounded-full" aria-hidden="true" />
              {availabilityLabel}
            </p>
          )}

          {/* A11Y-02 — the page's single h1. */}
          <h1 id="hero-heading" className="text-primary">
            {fullName}
          </h1>

          <p className="text-accent mt-3 font-mono text-sm tracking-[--tracking-mono] md:text-base">
            {roleTitle}
          </p>

          {/* The approved positioning line — largest visual weight after the
              name, and a <p>, never a heading (12.12 accessibility note). */}
          <p className="text-primary font-display mt-6 text-2xl leading-[1.25] font-semibold text-balance md:text-3xl">
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
            profile?.tagline && <p className="text-secondary measure mt-5">{profile.tagline}</p>
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

  if (!url) {
    return (
      <div className={cn(frame, 'bg-surface-raised grid place-items-center')}>
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
    <div className={frame}>
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
