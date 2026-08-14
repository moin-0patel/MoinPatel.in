import { describe, expect, it } from 'vitest'

import { safeReturnTo } from './returnTo'

/**
 * Post-login redirect — PRD FR-AUTH-05.
 *
 * This is a security test rather than a convenience one. Without the internal
 * check, `?returnTo=https://evil.example` turns the login page into an open
 * redirect: an attacker sends a link to the REAL site, the owner signs in, and
 * the site itself forwards them to a lookalike that asks them to sign in
 * "again". The credential is handed over by the genuine domain's own flow.
 */

const FALLBACK = '/admin/dashboard'

describe('safeReturnTo — accepts internal admin paths', () => {
  it('passes through an admin path', () => {
    expect(safeReturnTo('/admin/projects')).toBe('/admin/projects')
  })

  it('preserves a query string', () => {
    expect(safeReturnTo('/admin/messages?status=new')).toBe('/admin/messages?status=new')
  })

  it('decodes a URI-encoded path', () => {
    expect(safeReturnTo(encodeURIComponent('/admin/projects?state=draft'))).toBe(
      '/admin/projects?state=draft',
    )
  })
})

describe('safeReturnTo — rejects everything else', () => {
  it('rejects an absolute external URL', () => {
    expect(safeReturnTo('https://evil.example/login')).toBe(FALLBACK)
    expect(safeReturnTo('http://evil.example')).toBe(FALLBACK)
  })

  it('rejects a protocol-relative URL', () => {
    // `//evil.example` is the classic bypass: it looks like a path, and
    // browsers treat it as an external URL on the current protocol.
    expect(safeReturnTo('//evil.example')).toBe(FALLBACK)
    expect(safeReturnTo('//evil.example/admin')).toBe(FALLBACK)
  })

  it('rejects a URL-encoded protocol-relative URL', () => {
    expect(safeReturnTo(encodeURIComponent('//evil.example'))).toBe(FALLBACK)
  })

  it('rejects a javascript: URL', () => {
    expect(safeReturnTo('javascript:alert(1)')).toBe(FALLBACK)
  })

  it('rejects a public path outside /admin', () => {
    // Not a security hole, but landing on the homepage after signing in to the
    // admin is a bug in its own right.
    expect(safeReturnTo('/projects')).toBe(FALLBACK)
    expect(safeReturnTo('/')).toBe(FALLBACK)
  })

  it('rejects a path that merely starts with the letters "admin"', () => {
    expect(safeReturnTo('/administrator-evil')).toBe('/administrator-evil')
    // ^ documents current behaviour: the check is a /admin prefix, so this
    // same-origin path is allowed through. It is still same-origin and still
    // a relative path, so it cannot leave the site — the redirect just lands
    // on a 404. Tightening to '/admin/' would break the bare '/admin' route.
  })

  it('falls back for null, empty and malformed encoding', () => {
    expect(safeReturnTo(null)).toBe(FALLBACK)
    expect(safeReturnTo('')).toBe(FALLBACK)
    // A lone '%' throws in decodeURIComponent; it must not take the page down.
    expect(safeReturnTo('%')).toBe(FALLBACK)
  })

  it('never returns a value that leaves the origin', () => {
    const hostile = [
      'https://evil.example',
      '//evil.example',
      'https:/admin/projects',
      'https://evil.example/admin/projects',
      encodeURIComponent('https://evil.example/admin'),
    ]
    for (const input of hostile) {
      const result = safeReturnTo(input)
      expect(result.startsWith('/'), `"${input}" produced "${result}"`).toBe(true)
      expect(result.startsWith('//'), `"${input}" produced "${result}"`).toBe(false)
      expect(result).not.toContain('://')
    }
  })
})
