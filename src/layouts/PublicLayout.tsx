import { Download, Mail, Menu } from 'lucide-react'
import { Suspense, lazy, useEffect, useRef, useState, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { BRAND_ICONS } from '@/components/ui/brandIcons'
import { Button } from '@/components/ui/Button'
import { useIsTablet } from '@/hooks/useMediaQuery'
import { useProfile, usePublishedResume, useSettings, useSocialLinks } from '@/hooks/useSiteContent'
import { cn } from '@/lib/cn'
import { currentYear } from '@/lib/dates'

const SOCIAL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  ...BRAND_ICONS,
  mail: Mail,
  email: Mail,
}

/**
 * PublicLayout — PRD 9.3, FR-NAV-01…08.
 *
 * Landmark structure, skip link, header (with the FR-NAV-02 mobile sheet) and
 * the database-driven footer.
 *
 * Still outstanding here: the scroll-spy active state on Home.
 */

/*
 * Split navigation, matching the reference's composition.
 *
 * Measured at 1440: two groups of plain uppercase links, 18px / weight 500, the
 * left group starting at the gutter and the right group ending at it. No pills,
 * no filled active state, no numerals.
 *
 * Every destination is a route that exists. The reference's "Clients" and
 * "Services" have no factual equivalent here, so the slots carry Moin's real
 * sections instead of being padded to match its item count.
 */
const NAV_LEFT = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Work' },
] as const

const NAV_RIGHT = [
  { to: '/skills', label: 'Capabilities' },
  { to: '/experience', label: 'Experience' },
  { to: '/contact', label: 'Contact' },
] as const

/** Flat list for the mobile sheet and for verification. */
const NAV_ITEMS = [...NAV_LEFT, ...NAV_RIGHT]

export function PublicLayout() {
  /*
   * The header is fixed chrome (see Header), so it reserves no space and every
   * route's content begins at y=0.
   *
   * On Home that is the point: the hero is built to run full-bleed under the
   * navigation, exactly as the reference does — its wordmark sits at 7% of the
   * hero and the links sit over it.
   *
   * Every OTHER route opens with an <h1> instead, and those pages carry their
   * own `py-12 md:py-20`. At md and up that puts the heading at 80px, already
   * 16px clear of the 64px header. Below md it puts it at 48px — 16px UNDER
   * the header, measured on /about, /projects, /contact, /resume, /skills and
   * /experience at both 390 and 375. This padding closes exactly that gap and
   * lands the heading at the same 80px the desktop already used, rather than
   * reserving the header height on every route and pushing all six pages down.
   */
  const isHome = useLocation().pathname === '/'

  return (
    <div className="flex min-h-dvh flex-col">
      {/*
       * The design's ambient backdrop. CSS-only by decision: the export drove
       * it with a WebGL shader, and a second Three.js scene sat behind the
       * hero, loaded from ajax.googleapis.com. Neither is ported — a
       * third-party CDN script is blocked outright by the script-src 'self'
       * policy in vercel.json, and both would add JS to a PERF-05 budget that
       * is already over. Purely decorative, so it is hidden from AT.
       */}
      <div className="ambient-field" aria-hidden="true" />
      {/*
       * A11Y-05 / FR-NAV-04 — the first focusable element on every page.
       * Visually hidden until focused, never `display: none`, which would take
       * it out of the tab order entirely and defeat the purpose.
       */}
      <a
        href="#main"
        className={cn(
          'visually-hidden',
          // accent-strong for the same white-on-accent contrast reason as the
          // Button. axe never catches this one: it only exists while focused.
          'focus:bg-accent-strong focus:static focus:m-2 focus:inline-block focus:size-auto',
          'focus:rounded-(--radius-md) focus:px-4 focus:py-2 focus:text-white focus:[clip-path:none]',
        )}
      >
        Skip to content
      </a>

      <Header />

      {/* A11Y-01 — one <main> landmark, targeted by the skip link. */}
      <main id="main" className={cn('flex-1', !isHome && 'pt-8 md:pt-0')}>
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}

function Header() {
  /*
   * TRANSPARENT AND UNFILLED, matching the reference.
   *
   * The previous header was a glass bar with a filled active pill and mono
   * numerals — the last piece of the old portfolio's chrome. The reference has
   * no bar at all: the links sit directly on the ground in two groups with the
   * brand between them, and there is no surface behind them.
   *
   * It is `fixed top-0` — out of flow, like the reference's, which the Phase 0
   * audit records as "fixed chrome, outside the scroll range". It is NOT placed
   * at 47% of the hero the way the reference's is: that placement only works on
   * a page whose first screen is the hero, and this navigation is shared by
   * /about, /projects, /contact and the rest, where a mid-viewport nav would be
   * unusable. Same visual language, out of flow as the reference has it, with
   * the vertical placement as the one deliberate divergence.
   */
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/*
       * FIXED CHROME, NOT A BAR IN FLOW — and that is what makes the 64px
       * token usable at all. Header, MobileNavPanel and the boot shell in
       * index.html are one unit; change them together.
       *
       * `h-[--header-height]` was dead for a long time (Tailwind v4 drops a
       * bare custom property in the bracket form), so the row was content-sized
       * — measured 27.19px at desktop widths, 26.30-26.80 between, and 44px
       * below md, against the token's 64px.
       *
       * Correcting it while the header was `sticky top-0` was built and
       * measured, and it FAILED. Sticky keeps the element in flow, so the row
       * growing to 64px pushed the whole `min-h-[100svh]` hero down 36.81px on
       * desktop / 20px on mobile. The hero's CTA row has only 28.81px of fold
       * clearance, so "Let's Talk" / "View My Work" went 8px BELOW the fold at
       * 1440, 1280 and 1024, and the location chip was clipped 16px at
       * 768/390/375. No gate catches that — all 140 UI checks passed on the
       * broken composition; it was caught by screenshot.
       *
       * `fixed` is the fix, and it is also what the reference does. The Phase 0
       * audit records its navigation as "fixed chrome, outside the scroll
       * range", sitting OVER the composition, with the hero at `paddingTop: 0`.
       * Out of flow, the 64px costs zero vertical space: the hero starts at
       * y=0 like the reference's, every section moves UP by the old row height,
       * and the CTA row gains clearance instead of losing it.
       *
       * Two consequences that are not visible from this line:
       *
       *   the boot shell no longer needs `--boot-top` at all. It existed only
       *   to reproduce the in-flow header's height so the pre-hydration hero
       *   and the React hero landed in the same place; with nothing in flow
       *   above the hero, both start at 0 and the variable is gone;
       *
       *   this header has no background by design, so on every route content
       *   now scrolls UNDER it. That is only safe because the first element on
       *   each route clears 64px — measured on all six viewports across home,
       *   /about, /projects, /contact, /resume and a case study. Anything new
       *   at the top of a route must keep that clearance, and
       *   `scroll-padding-top: calc(var(--header-height) + 24px)` in globals.css
       *   is what keeps anchor targets clear of it.
       */}
      <div className="container-page flex h-(--header-height) items-center justify-between gap-6">
        {/* A11Y-01 — landmarks carry accessible names. */}
        <nav aria-label="Primary" className="hidden flex-1 md:block">
          <ul className="flex items-center gap-7">
            {NAV_LEFT.map((item) => (
              <li key={item.to}>
                <NavItem to={item.to} label={item.label} />
              </li>
            ))}
          </ul>
        </nav>

        <NavLink
          to="/"
          className="text-primary font-display shrink-0 text-base font-bold tracking-[0.14em]"
          aria-label="Moin Patel — home"
        >
          MP
        </NavLink>

        <nav aria-label="Secondary" className="hidden flex-1 md:block">
          <ul className="flex items-center justify-end gap-7">
            {NAV_RIGHT.map((item) => (
              <li key={item.to}>
                <NavItem to={item.to} label={item.label} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <HeaderResumeAction />

          {/* FR-NAV-02 — below 768px only. */}
          <MobileNavSheet />
        </div>
      </div>
    </header>
  )
}

/**
 * One navigation link, in the reference's treatment: uppercase, weight 500, no
 * container. The active state is weight and colour rather than a filled pill —
 * the reference marks nothing with a background.
 */
function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'font-display text-sm tracking-[0.06em] uppercase md:text-[0.95rem]',
          'transition-colors duration-(--duration-hover) ease-(--ease-out)',
          /*
           * The reference darkens the item's BACKGROUND under the pointer
           * (measured #ebeada -> #c9c8ba at 0.3s), not just its text.
           *
           * The negative margins cancel the padding so the type sits exactly
           * where it did before this was added — the header's measured layout
           * and the §12.3 heading positions do not move, only a rounded plate
           * appears behind the word on hover.
           */
          'rounded-full px-3 py-1.5 -mx-3 -my-1.5 hover:bg-surface',
          isActive ? 'text-primary font-semibold' : 'text-secondary hover:text-primary font-medium',
        )
      }
    >
      {label}
    </NavLink>
  )
}

/**
 * FR-NAV-01 — the Resume action in the header.
 *
 * Three conditions must all hold before it renders, and each hides it for a
 * different reason:
 *
 *   resumePending          nothing yet. Rendering and then removing it is the
 *                          layout shift PERF-03 forbids.
 *   !resume                FR-RES-06 — nothing published, so every resume CTA
 *                          is hidden site-wide rather than offered and broken.
 *   navResumeVisible false the owner switched it off in Settings.
 *
 * Desktop only (`hidden md:inline-flex`): below 768px the sheet carries the
 * navigation, and a second action next to the hamburger crowds a 375px header.
 */
function HeaderResumeAction() {
  const { data: resume, isPending } = usePublishedResume()
  const { data: settings } = useSettings()

  if (isPending || !resume || settings?.navResumeVisible === false) return null

  return (
    <Button size="sm" variant="secondary" className="hidden md:inline-flex" asChild>
      <NavLink to="/resume">
        <Download className="size-4" aria-hidden="true" />
        Resume
      </NavLink>
    </Button>
  )
}

/*
 * The sheet's contents live in a separate, lazily-imported module.
 *
 * Radix Dialog is ~12 KB gzipped. Importing it here — PublicLayout renders on
 * every public route — pulled it out of the lazy admin/case-study chunks and
 * into the public entry chunk, pushing initial JS from ~176 KB to 183.71 KB
 * and breaking the 180 KB PERF-05 budget. Deferring it keeps the entry chunk
 * to a plain button and fetches Radix only if someone opens the menu, which
 * never happens on desktop.
 */
const MobileNavPanel = lazy(() => import('@/components/common/MobileNavPanel'))

const MOBILE_NAV_PANEL_ID = 'mobile-nav-panel'

/**
 * MobileNavSheet — PRD FR-NAV-02 (P0), 9.3, 12.1, RES-01, A11Y-11.
 *
 * "Header collapses to a hamburger sheet below 768px, with focus trap, Esc
 * close, backdrop close and body scroll lock."
 *
 * This component is only the trigger and the open state. Everything the
 * requirement actually names — focus trap, Esc, backdrop dismissal, scroll
 * lock, role/aria-modal, focus returned to the trigger — is Radix's, inside
 * MobileNavPanel. PRD 29.3 chose headless primitives precisely so this
 * behaviour is not hand-rolled.
 *
 * `aria-expanded` and `aria-controls` are set here rather than by
 * Dialog.Trigger, since the dialog is not mounted until first open. Both read
 * from the same `open` state that drives the panel, so they cannot fall out
 * of step with it. `aria-controls` is omitted while closed because the
 * element it names does not exist yet — which is also what Radix itself does.
 */
function MobileNavSheet() {
  const [open, setOpen] = useState(false)
  // Once opened, the panel stays mounted so reopening costs no second fetch.
  const [everOpened, setEverOpened] = useState(false)
  const isTabletUp = useIsTablet()
  // The panel focuses this on close; Radix cannot, since it looks for its own
  // Dialog.Trigger and there is none. See MobileNavPanel's onCloseAutoFocus.
  const triggerRef = useRef<HTMLButtonElement>(null)

  /*
   * Close if the viewport grows past the breakpoint while the sheet is open.
   *
   * Without this, resizing (or rotating a tablet) hides the sheet via
   * `md:hidden` while Radix still considers it open — leaving body scroll
   * locked and focus trapped inside an invisible dialog, with no visible way
   * out. CSS can hide it; only state can close it.
   */
  useEffect(() => {
    if (isTabletUp) setOpen(false)
  }, [isTabletUp])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        // RES-07 — 44px touch target. The negative margin keeps the header
        // height unchanged while the hit area stays full size.
        className={cn(
          'text-secondary hover:text-primary -mr-2 grid size-11 place-items-center',
          'rounded-(--radius-sm) md:hidden',
          'transition-colors duration-(--duration-hover) ease-(--ease-out)',
        )}
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? MOBILE_NAV_PANEL_ID : undefined}
        onClick={() => {
          setEverOpened(true)
          setOpen(true)
        }}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {everOpened && (
        // No fallback: the chunk is a few KB and a flash of placeholder would
        // be worse than the sheet appearing a moment later.
        <Suspense fallback={null}>
          <MobileNavPanel
            id={MOBILE_NAV_PANEL_ID}
            open={open}
            onOpenChange={setOpen}
            items={NAV_ITEMS}
            triggerRef={triggerRef}
          />
        </Suspense>
      )}
    </>
  )
}

/**
 * FR-NAV-03 — name, positioning line, quick links, database-driven social
 * links, email, a dynamic copyright year, and the build credit.
 */
function Footer() {
  const { data: profile } = useProfile()
  const { data: socialLinks } = useSocialLinks()

  // 12.11 — only links flagged for the footer, and only published ones (the
  // service already applies the publication filter).
  const footerSocials = (socialLinks ?? []).filter((link) => link.showInFooter)

  return (
    <footer className="mt-24" role="contentinfo">
      {/*
       * THE CLOSING WORDMARK — the reference's most distinctive sign-off.
       *
       * Before its FAQ and footer it sets its name once more at wordmark
       * scale, brighter than anything else on the page and cropped by the
       * viewport exactly as the hero's is. Measured on the final-phase audit;
       * without it our page simply stopped, where the reference closes the
       * loop it opened at the top.
       *
       * The same clamp, tracking and colour as the hero wordmark, so the two
       * bookend the page as one voice. `aria-hidden` for the same reason the
       * hero's is: the name is announced by the footer's own text below, and
       * hearing it twice is noise. The name comes from the profile — nothing
       * hardcoded beyond the same fallback the footer already used.
       */}
      <p
        aria-hidden="true"
        className={cn(
          'pointer-events-none overflow-hidden text-center select-none',
          'font-display font-bold whitespace-nowrap text-[color:var(--color-accent-word)]',
          'leading-[0.78] tracking-[-0.045em]',
          'text-[clamp(3.5rem,16vw,14rem)]',
        )}
      >
        {(profile?.fullName ?? 'Moin Patel').toUpperCase()}
      </p>

      <div className="border-subtle border-t">
        <div className="container-page grid gap-8 py-12 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-primary font-display text-lg font-semibold">
              {profile?.fullName ?? 'Moin Patel'}
            </p>
            {/* The approved positioning line (PRD 2). */}
            <p className="text-secondary measure mt-2 text-sm">
              {profile?.positioningLine ??
                'Building AI-powered systems that automate work, save time, and reduce business costs.'}
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="text-muted mb-3 font-mono text-xs tracking-(--tracking-mono) uppercase">
              Pages
            </h2>
            <ul className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className="text-secondary hover:text-primary text-sm transition-colors duration-(--duration-hover) ease-(--ease-out)"
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* 12.11 "Empty": the whole column is hidden when nothing is published.
            That is the state today — LinkedIn and GitHub are unpublished
            placeholders pending Q-02/Q-03. */}
          {(footerSocials.length > 0 || profile?.emailPublic) && (
            <div>
              <h2 className="text-muted mb-3 font-mono text-xs tracking-(--tracking-mono) uppercase">
                Elsewhere
              </h2>
              <ul className="flex flex-col gap-2">
                {footerSocials.map((link) => {
                  const Icon = SOCIAL_ICONS[link.iconKey] ?? Mail
                  const isExternal = link.url.startsWith('http')
                  return (
                    <li key={link.id}>
                      <a
                        href={link.url}
                        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="text-secondary hover:text-primary inline-flex items-center gap-2 text-sm transition-colors duration-(--duration-hover) ease-(--ease-out)"
                      >
                        <Icon className="size-4" />
                        {link.label}
                        {isExternal && (
                          <span className="visually-hidden">(opens in a new tab)</span>
                        )}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="container-page border-subtle text-muted flex flex-col gap-2 border-t py-6 text-xs md:flex-row md:justify-between">
          {/* FR-NAV-03 — the year is dynamic, not a hard-coded string that
              silently goes stale on 1 January. */}
          <p>© {currentYear()} Moin Patel</p>
          <p>Built with React, TypeScript and Supabase.</p>
        </div>
      </div>
    </footer>
  )
}
