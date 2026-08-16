import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import { SEO } from '@/components/common/SEO'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { safeReturnTo } from '@/lib/returnTo'
import { requestPasswordReset } from '@/services/auth.service'

/**
 * Admin sign-in — PRD FR-AUTH-01, FR-AUTH-02, FR-AUTH-05, AC-AUTH.
 *
 * There is no sign-up link, no "create account", no magic-link alternative.
 * FR-AUTH-01: the only authenticated identity is the site owner, and sign-ups
 * are additionally disabled in the Supabase project settings — a UI with no
 * sign-up button but an open auth endpoint is not a control.
 */
export default function AdminLoginPage() {
  const { session, isAdmin, loading, signIn } = useAuth()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnTo(searchParams.get('returnTo'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  // AC-AUTH-8 — no flash of the login form for someone already signed in.
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status" aria-live="polite">
        <span className="visually-hidden">Checking your session…</span>
      </div>
    )
  }

  if (session && isAdmin) return <Navigate to={returnTo} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await signIn(email, password)
    setSubmitting(false)

    if (!result.ok) {
      // FR-AUTH-02 / AC-AUTH-2 — one generic message. Never "no such user" or
      // "wrong password": either would confirm which emails have accounts.
      setError(result.message)
      // Password is cleared, email is kept. Retyping a correct email after a
      // typo in the password is pointless friction.
      setPassword('')
      emailRef.current?.focus()
    }
    // On success the AuthProvider's onAuthStateChange fires and the redirect
    // above takes over — no manual navigate needed.
  }

  return (
    <>
      <SEO title="Sign in · Moin Patel" noindex />
      <div className="container-page grid min-h-dvh place-items-center py-12">
        <div className="w-full max-w-sm">
          <p className="text-muted font-mono text-xs tracking-[0.18em]">MP · ADMIN</p>
          <h1 className="text-primary mt-3 text-2xl">Sign in</h1>

          {/* `void` because a form's onSubmit expects a void return; handing it
              a promise means React never sees the rejection. Errors are handled
              inside handleSubmit, so there is nothing to await here. */}
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="mt-8 space-y-4"
            noValidate
          >
            {error && (
              // A11Y-07 / A11Y-12 — announced, and linked to both inputs below.
              <p
                id={errorId}
                role="alert"
                className="border-danger/30 bg-danger-soft text-danger rounded-[--radius-sm] border px-3 py-2 text-sm"
              >
                {error}
              </p>
            )}

            <Field id={emailId} label="Email">
              <input
                ref={emailRef}
                id={emailId}
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                inputMode="email" // RES-08 — correct mobile keyboard
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? true : undefined}
                className={inputClass}
              />
            </Field>

            <Field id={passwordId} label="Password">
              <input
                id={passwordId}
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? true : undefined}
                className={inputClass}
              />
            </Field>

            <Button type="submit" loading={submitting} className="w-full" size="lg">
              Sign in
            </Button>
          </form>

          <ForgotPassword email={email} />
        </div>
      </div>
    </>
  )
}

/**
 * FR-AUTH-08 — request a reset email.
 *
 * The confirmation is deliberately identical whether or not the address has an
 * account. Saying "no account with that email" turns this box into an oracle
 * for enumerating valid admin addresses (SEC-04), and there is exactly one
 * admin account to find.
 *
 * `redirectTo` is a courtesy, not a control: Supabase only honours origins on
 * the project's allow-list, so a tampered value is rejected server-side.
 */
function ForgotPassword({ email }: { email: string }) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleClick = async () => {
    setSending(true)
    try {
      await requestPasswordReset(email, `${window.location.origin}/admin/reset-password`)
    } catch {
      // Swallowed on purpose — see above. A failure here must look exactly
      // like a success, or the difference is itself the disclosure.
    } finally {
      setSending(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <p role="status" className="text-secondary mt-4 text-center text-sm">
        If that address has an account, a reset link is on its way. It expires after one use.
      </p>
    )
  }

  return (
    <div className="mt-4 text-center">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={!email.trim() || sending}
        className={cn(
          'text-secondary hover:text-accent text-sm underline underline-offset-4',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        title={!email.trim() ? 'Enter your email address first.' : undefined}
      >
        {sending ? 'Sending…' : 'Forgot your password?'}
      </button>
    </div>
  )
}

/** 32.4 — label above, never a placeholder standing in for a label (A11Y-07). */
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-secondary block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass = cn(
  'bg-surface border-subtle text-primary w-full rounded-[--radius-sm] border',
  'h-11 px-3 text-sm', // RES-07 — 44px minimum
  'transition-colors duration-[--duration-hover] ease-[--ease-out]',
  'focus:border-accent',
)
