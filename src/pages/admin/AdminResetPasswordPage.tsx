import { CheckCircle2, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { SEO } from '@/components/common/SEO'
import { Button } from '@/components/ui/Button'
import { pageTitle } from '@/lib/seo'
import { getSession, onPasswordRecovery, signOut, updatePassword } from '@/services/auth.service'

/**
 * /admin/reset-password — PRD FR-AUTH-08.
 *
 * Where the emailed recovery link lands. Supabase's client parses the tokens
 * out of the URL fragment on load and emits a `PASSWORD_RECOVERY` event, which
 * establishes a temporary session. That session — not an old password — is
 * what authorises the change.
 *
 * The three states below are distinct on purpose:
 *
 *   checking   tokens not parsed yet. Showing the form here and having it fail
 *              on submit would be worse than a moment's wait.
 *   invalid    no recovery session. Almost always an expired or reused link,
 *              so the recovery is offered again rather than dead-ending.
 *   ready      a recovery session exists; the form can do its job.
 *
 * `noindex` throughout: a reset page in search results is a phishing target.
 */

const MIN_PASSWORD_LENGTH = 10

type Phase = 'checking' | 'invalid' | 'ready' | 'done'

export default function AdminResetPasswordPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  /*
   * Both paths are needed. onAuthStateChange catches PASSWORD_RECOVERY when
   * the SDK finishes parsing the fragment; getSession covers the case where
   * that already happened before this component mounted, which is a race the
   * event alone loses.
   */
  useEffect(() => {
    let settled = false

    const unsubscribe = onPasswordRecovery(() => {
      settled = true
      setPhase('ready')
    })

    void getSession().then((session) => {
      if (settled) return
      setPhase(session ? 'ready' : 'invalid')
    })

    return unsubscribe
  }, [])

  const validate = (): string | null => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (password !== confirm) {
      return 'The two passwords do not match.'
    }
    return null
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updatePassword(password)
      setPhase('done')
      /*
       * Signed out deliberately. The recovery session was minted by a link in
       * an inbox; continuing straight into the admin on it means anyone who
       * can read that inbox is now inside. Re-authenticating with the NEW
       * password is the point of having changed it.
       */
      await signOut()
      setTimeout(() => void navigate('/admin/login'), 2500)
    } catch {
      setError('That password could not be set. The link may have expired.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-base grid min-h-dvh place-items-center px-4">
      <SEO title={pageTitle('Reset password · Admin')} noindex />

      <div className="border-subtle bg-surface w-full max-w-sm rounded-(--radius-lg) border p-6">
        <p className="text-muted font-mono text-xs tracking-[0.18em]">MP · ADMIN</p>

        {phase === 'checking' && (
          <p className="text-secondary mt-6 text-sm" role="status">
            Checking your reset link…
          </p>
        )}

        {phase === 'invalid' && (
          <>
            <h1 className="text-primary mt-4 text-xl font-semibold">This link has expired</h1>
            <p className="text-secondary mt-2 text-sm">
              Password reset links can only be used once, and time out. Request a new one from the
              login page.
            </p>
            <Button className="mt-6 w-full" asChild>
              <a href="/admin/login">Back to login</a>
            </Button>
          </>
        )}

        {phase === 'done' && (
          <div role="status">
            <CheckCircle2 className="text-success mt-4 size-8" aria-hidden="true" />
            <h1 className="text-primary mt-3 text-xl font-semibold">Password changed</h1>
            <p className="text-secondary mt-2 text-sm">
              Signing you out so you can log in with the new one. Redirecting…
            </p>
          </div>
        )}

        {phase === 'ready' && (
          <>
            <h1 className="text-primary mt-4 text-xl font-semibold">Choose a new password</h1>

            <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="text-secondary mb-1.5 block text-sm font-medium"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  // Tells a password manager to offer generation rather than
                  // autofilling the password being replaced.
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby="password-hint"
                  className="border-strong bg-base text-primary focus:border-accent w-full rounded-(--radius-sm) border px-3 py-2 text-sm focus:outline-none"
                />
                <p id="password-hint" className="text-muted mt-1 text-xs">
                  At least {MIN_PASSWORD_LENGTH} characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="text-secondary mb-1.5 block text-sm font-medium"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="border-strong bg-base text-primary focus:border-accent w-full rounded-(--radius-sm) border px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              {error && (
                <p role="alert" className="text-danger text-sm">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" loading={saving}>
                <KeyRound className="size-4" aria-hidden="true" />
                Set new password
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
