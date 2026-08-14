import { describe, expect, it } from 'vitest'

import { isExternalUrl, markdownSanitiseSchema } from './markdown'

/**
 * Markdown sanitisation policy — PRD 41.1: "raw HTML is stripped; disallowed
 * nodes are removed; links get rel."
 *
 * These assert the POLICY (the allow-list the renderer is configured with)
 * rather than rendered output, which would need a DOM. The rendering half is
 * covered by the component test suite; what matters here is that the
 * allow-list cannot quietly grow.
 *
 * Case-study bodies are the largest free-text surface in the product and are
 * editable from the CMS, so SEC-05 makes this the highest-value policy in the
 * codebase to pin down.
 */

describe('sanitise schema — allow-list, not deny-list', () => {
  const allowed = new Set<string>(markdownSanitiseSchema.tagNames)

  it('permits exactly the nodes FR-CASE-02 lists', () => {
    for (const tag of [
      'p',
      'strong',
      'em',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'h3',
      'h4',
    ]) {
      expect(allowed.has(tag), `${tag} should be allowed`).toBe(true)
    }
  })

  it('excludes script, style, iframe, object and embed', () => {
    for (const tag of ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input']) {
      expect(allowed.has(tag), `${tag} must NOT be allowed`).toBe(false)
    }
  })

  it('excludes h1 and h2, which belong to the page outline', () => {
    // A11Y-02: one h1 per page, levels never skip. A case-study body that
    // could emit an h1 would break the document outline from a database field.
    expect(allowed.has('h1')).toBe(false)
    expect(allowed.has('h2')).toBe(false)
  })

  it('excludes img — project images are structured rows with required alt text', () => {
    // project_images.alt_text is NOT NULL (A11Y-06, MED-03). An <img> written
    // into markdown would bypass that guarantee entirely.
    expect(allowed.has('img')).toBe(false)
  })

  it('excludes svg, which is an XSS vector when served same-origin (SEC-06)', () => {
    expect(allowed.has('svg')).toBe(false)
  })
})

describe('sanitise schema — attributes', () => {
  it('permits only href and title on links', () => {
    expect(markdownSanitiseSchema.attributes.a).toEqual(['href', 'title'])
  })

  it('permits no event handlers or style on any element', () => {
    const everyAttribute = Object.values(markdownSanitiseSchema.attributes).flat()
    for (const attribute of everyAttribute) {
      const name = String(attribute)
      expect(name.startsWith('on'), `${name} is an event handler`).toBe(false)
      expect(name).not.toBe('style')
    }
  })

  it('does not allow target on links — the renderer decides that, not the author', () => {
    // FR-NAV-06 requires rel="noopener noreferrer" alongside target="_blank".
    // Letting an author set target without rel would drop the noopener.
    expect(markdownSanitiseSchema.attributes.a).not.toContain('target')
  })
})

describe('sanitise schema — protocols', () => {
  it('permits only http, https and mailto in href', () => {
    expect(markdownSanitiseSchema.protocols.href).toEqual(['http', 'https', 'mailto'])
  })

  it('excludes javascript: and data:', () => {
    // `data:` in an href is a script vector in older engines and has no
    // legitimate use in a case study.
    expect(markdownSanitiseSchema.protocols.href).not.toContain('javascript')
    expect(markdownSanitiseSchema.protocols.href).not.toContain('data')
  })
})

describe('isExternalUrl (FR-NAV-06)', () => {
  it('treats http, https and mailto as external', () => {
    expect(isExternalUrl('https://example.com')).toBe(true)
    expect(isExternalUrl('http://example.com')).toBe(true)
    expect(isExternalUrl('HTTPS://EXAMPLE.COM')).toBe(true)
    expect(isExternalUrl('mailto:a@b.co')).toBe(true)
  })

  it('treats site-relative links and anchors as internal, so they stay in the SPA', () => {
    expect(isExternalUrl('/projects')).toBe(false)
    expect(isExternalUrl('#architecture')).toBe(false)
    expect(isExternalUrl('projects/slug')).toBe(false)
  })

  it('returns false for undefined rather than throwing', () => {
    expect(isExternalUrl(undefined)).toBe(false)
    expect(isExternalUrl('')).toBe(false)
  })
})
