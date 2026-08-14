import {
  FileText,
  FolderKanban,
  GraduationCap,
  Image,
  LayoutDashboard,
  Link2,
  Mail,
  Settings,
  Sparkles,
  Briefcase,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { SEO } from '@/components/common/SEO'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

/**
 * AdminLayout — PRD 9.3, FR-ADM-02, 32.6.
 *
 * "Admin must never look like an unstyled bolt-on" (32.6): same tokens, same
 * typography, same primitives as the public site, with denser spacing, a fixed
 * sidebar, and no entry animations — they slow repetitive work.
 *
 * Sidebar at >= 1024px, bottom tab bar below with the five most-used
 * destinations. RES-06 governs the tables inside: stacked record cards below
 * 768px, usable at 390px without horizontal scroll.
 */

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, primary: true },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban, primary: true },
  { to: '/admin/experience', label: 'Experience', icon: Briefcase, primary: false },
  { to: '/admin/skills', label: 'Skills', icon: Sparkles, primary: false },
  { to: '/admin/education', label: 'Education', icon: GraduationCap, primary: false },
  { to: '/admin/social-links', label: 'Social links', icon: Link2, primary: false },
  { to: '/admin/messages', label: 'Messages', icon: Mail, primary: true },
  { to: '/admin/media', label: 'Media', icon: Image, primary: true },
  { to: '/admin/resume', label: 'Resume', icon: FileText, primary: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, primary: true },
] as const

export function AdminLayout() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
    } finally {
      // Navigate even if the sign-out request failed. The local session is
      // already cleared by then, so leaving the user on an admin screen that
      // will fail every subsequent query is the worse outcome (FR-AUTH-06).
      void navigate('/', { replace: true })
    }
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* SEO-09 — /admin/* is noindex, nofollow, on every admin route at once. */}
      <SEO title="Admin · Moin Patel" noindex />

      <a
        href="#admin-main"
        className="visually-hidden focus:static focus:m-2 focus:size-auto focus:[clip-path:none]"
      >
        Skip to content
      </a>

      {/* Sidebar — >= 1024px */}
      <aside className="bg-surface-raised border-subtle hidden w-60 shrink-0 border-r lg:block">
        <div className="flex h-full flex-col p-4">
          <NavLink
            to="/admin/dashboard"
            className="mb-6 px-2 font-mono text-sm font-semibold tracking-[0.18em]"
          >
            MP · ADMIN
          </NavLink>

          <nav aria-label="Admin" className="flex-1">
            <ul className="space-y-0.5">
              {NAV.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <AdminNavLink to={to} label={label}>
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                  </AdminNavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-subtle mt-4 space-y-2 border-t pt-4">
            {session?.user.email && (
              <p className="text-muted truncate px-2 text-xs" title={session.user.email}>
                {session.user.email}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => void handleSignOut()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main id="admin-main" className="min-w-0 flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Bottom tabs — < 1024px, five most-used destinations (9.3). */}
      <nav
        aria-label="Admin"
        className="glass fixed inset-x-0 bottom-0 z-50 border-t border-b-0 lg:hidden"
      >
        <ul className="flex items-stretch justify-around">
          {NAV.filter((item) => item.primary).map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    // RES-07 — >= 44px touch target.
                    'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem]',
                    isActive ? 'text-accent' : 'text-muted',
                  )
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function AdminNavLink({
  to,
  label,
  children,
}: {
  to: string
  label: string
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-[--radius-sm] px-2 py-2 text-sm',
          'transition-colors duration-[--duration-hover] ease-[--ease-out]',
          isActive
            ? 'bg-accent-soft text-accent'
            : 'text-secondary hover:text-primary hover:bg-surface',
        )
      }
    >
      {children}
      <span className="truncate">{label}</span>
    </NavLink>
  )
}
