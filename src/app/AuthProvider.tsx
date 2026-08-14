import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AuthContext, type AuthState } from '@/app/authContext'
import * as authService from '@/services/auth.service'

/**
 * Auth state — PRD 30.3.
 *
 * A single provider exposing session, admin membership and the two actions,
 * subscribed to `onAuthStateChange`. There is no global store beyond this
 * (TD-13): auth is the only cross-page client state in the product.
 *
 * `loading` matters more than it looks. FR-AUTH-04 and AC-AUTH-8 forbid both
 * failure modes — a flash of admin UI before the check resolves, and a flash
 * of the login form for someone already signed in. Consumers must render a
 * spinner while this is true rather than guessing from `session`.
 */

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    /**
     * Resolve session and admin membership together. Setting `loading` false
     * after the session but before the membership check would open exactly the
     * window AC-AUTH-8 forbids.
     */
    const resolve = async (next: Session | null) => {
      if (!active) return
      setSession(next)

      if (!next?.user) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const admin = await authService.checkIsAdmin(next.user.id)
      if (!active) return
      setIsAdmin(admin)
      setLoading(false)
    }

    void authService.getSession().then(resolve)

    // Fires on sign-in, sign-out and token refresh. Re-checking membership on
    // refresh means revoking admin in SQL takes effect within one token
    // lifetime rather than persisting for the whole session.
    const unsubscribe = authService.onAuthStateChange((next) => {
      setLoading(true)
      void resolve(next)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    return authService.signIn(email, password)
  }, [])

  /**
   * FR-AUTH-06 — clearing the cache is not housekeeping. Admin queries hold
   * drafts and contact messages; leaving them in memory after sign-out would
   * let the next person at the same browser read them from cache.
   */
  const signOut = useCallback(async () => {
    await authService.signOut()
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthState>(
    () => ({ session, isAdmin, loading, signIn, signOut }),
    [session, isAdmin, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
