import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'

import type { SignInResult } from '@/services/auth.service'

/**
 * The auth context lives in its own module so AuthProvider.tsx exports only a
 * component. That keeps Fast Refresh working during development — a file that
 * mixes a component with a non-component export loses its state on every edit.
 */
export type AuthState = {
  session: Session | null
  isAdmin: boolean
  /** True until BOTH the session and the admin check have resolved.
   *  FR-AUTH-04 / AC-AUTH-8 depend on consumers respecting this. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | undefined>(undefined)
