import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'

/**
 * ProtectedRoute — PRD FR-AUTH-04, FR-AUTH-05.
 *
 * Checks the session AND admin membership before rendering. Both, not either:
 * a signed-in user without an `admin_users` row is unauthorised (AC-AUTH-6).
 *
 * FR-AUTH-07 is the important caveat. This is UX only. Every table's RLS
 * rejects non-admin writes independently, so bypassing this component in the
 * client buys nothing — the database still refuses. Treating a route guard as
 * a security boundary is the mistake Principle 6 names: "hiding an admin
 * button is not access control".
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading } = useAuth()
  const location = useLocation()

  // AC-AUTH-8: never a flash of admin UI before the check resolves, and never
  // a flash of the login form for someone already signed in. Rendering a
  // spinner for both is the only way to guarantee neither.
  if (loading) {
    return (
      <div className="grid min-h-[60dvh] place-items-center" role="status" aria-live="polite">
        <Loader2 className="text-muted size-6 animate-spin" aria-hidden="true" />
        <span className="visually-hidden">Checking your session…</span>
      </div>
    )
  }

  if (!session || !isAdmin) {
    // FR-AUTH-05 — returnTo carries the intended destination so signing in
    // lands where the user was going, not on a generic dashboard.
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/admin/login?returnTo=${returnTo}`} replace />
  }

  return <>{children}</>
}
