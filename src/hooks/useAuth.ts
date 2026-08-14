import { useContext } from 'react'

import { AuthContext, type AuthState } from '@/app/authContext'

/**
 * Access the auth state. Throws outside the provider rather than returning a
 * default, because a silent "not signed in" default would render the admin as
 * logged out with no indication that the provider is missing.
 */
export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }
  return context
}
