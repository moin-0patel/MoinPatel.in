/**
 * FR-AUTH-05 — only internal admin paths are accepted as a post-login return
 * target.
 *
 * Without this check, `?returnTo=https://evil.example` turns the login page
 * into an open redirect: an attacker sends a victim a link to the real site,
 * the victim signs in, and the site itself forwards them to a lookalike. It is
 * a phishing primitive, and it is free to prevent.
 */
export function safeReturnTo(raw: string | null): string {
  const fallback = '/admin/dashboard'
  if (!raw) return fallback

  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return fallback
  }

  const isInternalAdminPath =
    decoded.startsWith('/admin') &&
    !decoded.startsWith('//') && // protocol-relative — browsers treat as external
    !decoded.includes('://')

  return isInternalAdminPath ? decoded : fallback
}
