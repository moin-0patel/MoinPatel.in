import { Download, Mail, Menu } from 'lucide-react'
import { Suspense, lazy, useEffect, useRef, useState, type ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

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

const NAV_ITEMS = [
  { to: '/about', label: 'About' },
  { to: '/experience', label: 'Experience' },
  { to: '/projects', label: 'Projects' },
  { to: '/skills', label: 'Skills' },
  { to: '/contact', label: 'Contact' },
] as const

export function PublicLayout() {
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
          'focus:rounded-[--radius-md] focus:px-4 focus:py-2 focus:text-white focus:[clip-path:none]',
        )}
      >
        Skip to content
      </a>

      <Header />

      {/* A11Y-01 — one <main> landmark, targeted by the skip link. */}
      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="glass sticky top-0 z-50">
      <div className="container-page flex h-[--header-height] items-center justify-between gap-6">
        <NavLink
          to="/"
          className="text-primary font-display text-base font-bold tracking-[0.14em]"
          aria-label="Moin Patel — home"
        >
          MP
        </NavLink>

        {/* A11Y-01 — landmarks carry accessible names. */}
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-[--radius-sm] px-3 py-2 text-sm',
                      'transition-colors duration-[--duration-hover] ease-[--ease-out]',
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-secondary hover:text-primary hover:bg-surface',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <HeaderResumeAction />

          {/* FR-NAV-02 — below 768px only. The desktop nav above is untouched. */}
          <MobileNavSheet />
        </div>
      </div>
    </header>
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
          'rounded-[--radius-sm] md:hidden',
          'transition-colors duration-[--duration-hover] ease-[--ease-out]',
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
    <footer className="border-subtle mt-24 border-t" role="contentinfo">
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
          <h2 className="text-muted mb-3 font-mono text-xs tracking-[--tracking-mono] uppercase">
            Pages
          </h2>
          <ul className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className="text-secondary hover:text-primary text-sm">
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
            <h2 className="text-muted mb-3 font-mono text-xs tracking-[--tracking-mono] uppercase">
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
                      className="text-secondary hover:text-primary inline-flex items-center gap-2 text-sm"
                    >
                      <Icon className="size-4" />
                      {link.label}
                      {isExternal && <span className="visually-hidden">(opens in a new tab)</span>}
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
    </footer>
  )
}
