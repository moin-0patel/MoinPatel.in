import type { Session } from '@supabase/supabase-js'

import { AppError, reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'

/**
 * Auth service — PRD 21.
 *
 * Restating the boundary, because it is the one place a portfolio CMS usually
 * gets wrong: everything in this file is UX. `<ProtectedRoute>` stopping a
 * render is a convenience so the admin does not see a broken screen. The
 * actual authorisation is RLS, which rejects every write independently
 * (FR-AUTH-07, AC-RLS-6). Nothing here is load-bearing for security.
 */

export type SignInResult = { ok: true } | { ok: false; message: string }

/**
 * FR-AUTH-02 — errors are generic and never disclose which field was wrong.
 * "No account with that email" would confirm which addresses exist, which is
 * the enumeration signal AC-AUTH-2 prohibits.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) return { ok: false, message: 'Invalid email or password.' }
    return { ok: true }
  } catch (cause) {
    reportError(cause, 'auth.signIn')
    return { ok: false, message: 'Could not sign in right now. Please try again.' }
  }
}

/** FR-AUTH-06. Clearing the query cache is the caller's job — see AuthProvider. */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (cause) {
    throw reportError(cause, 'auth.signOut')
  }
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/**
 * FR-AUTH-09 / TD-04 — admin identity is membership in `admin_users`, checked
 * against the database. Never an email string compiled into the frontend, and
 * never a JWT claim the user can edit.
 *
 * The `admin_users_select_self` policy lets a signed-in user read only their
 * own row, so this returns false for a non-admin rather than erroring — which
 * is exactly the "treated as unauthorised" behaviour AC-AUTH-6 describes.
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data !== null
  } catch (cause) {
    reportError(cause, 'auth.checkIsAdmin')
    // Fail closed. An unreachable database must not grant admin.
    return false
  }
}

/** FR-AUTH-08 — the redirect URL is additionally restricted to known origins
 *  in the Supabase auth settings; this parameter alone is not a control. */
export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    })
    if (error) throw error
  } catch (cause) {
    throw new AppError('unknown', 'auth.requestPasswordReset', { cause })
  }
}

/** Subscribe to session changes. Returns an unsubscribe function. */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => data.subscription.unsubscribe()
}
