import { Mail } from 'lucide-react'
import type { ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { BRAND_ICONS } from '@/components/ui/brandIcons'
import { useProfile, useSocialLinks } from '@/hooks/useSiteContent'
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
 * Phase 6 scope: the landmark structure, skip link, header and footer shell.
 * The mobile nav sheet (FR-NAV-02), scroll-spy active state, database-driven
 * social links and the Resume action are Phase 8, where the data they need is
 * wired up. The structure is here so every route resolves with correct
 * semantics from the start rather than being retrofitted.
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
       * A11Y-05 / FR-NAV-04 — the first focusable element on every page.
       * Visually hidden until focused, never `display: none`, which would take
       * it out of the tab order entirely and defeat the purpose.
       */}
      <a
        href="#main"
        className={cn(
          'visually-hidden',
          'focus:bg-accent focus:static focus:m-2 focus:inline-block focus:size-auto',
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
          className="font-mono text-sm font-semibold tracking-[0.18em]"
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
                        ? 'text-primary underline decoration-[--color-accent] decoration-2 underline-offset-8'
                        : 'text-secondary hover:text-primary',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/*
         * FR-NAV-02: below 768px this becomes a full-screen sheet with a focus
         * trap, Esc/backdrop close and body scroll lock — Phase 8. Until then
         * the links are reachable from the footer, so no route is orphaned on
         * mobile.
         */}
      </div>
    </header>
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
