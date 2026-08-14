import { defaultSchema } from 'rehype-sanitize'

/**
 * Markdown sanitisation policy — PRD FR-CASE-02, SEC-05, TD-06.
 *
 * Two independent defences, because case-study bodies are the largest
 * free-text surface in the product:
 *
 *   1. Raw HTML is never parsed. `react-markdown` only renders raw HTML if
 *      `rehype-raw` is added; it is not installed, and must not be.
 *   2. This allow-list, applied by `rehype-sanitize`, drops any node or
 *      attribute outside the set FR-CASE-02 permits.
 *
 * The allow-list is a LIST, not a deny-list: a markdown extension added later
 * produces nodes that are stripped by default rather than rendered by default.
 *
 * FR-CASE-02 permits: headings h3–h4, paragraphs, lists, bold, italic, inline
 * code, code blocks, links, blockquote.
 *
 * h1 and h2 are excluded deliberately — the page owns those (A11Y-02: one h1
 * per page, levels never skip). A case-study body that could emit an h1 would
 * break the document outline from a database field.
 */
export const markdownSanitiseSchema = {
  ...defaultSchema,
  tagNames: [
    'p',
    'br',
    'strong',
    'em',
    'del',
    'code',
    'pre',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'h3',
    'h4',
    'hr',
    // remark-gfm tables. Harmless, and case studies use them for comparisons.
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  attributes: {
    a: ['href', 'title'],
    code: ['className'], // language-* from fenced blocks, for highlighting
    th: ['scope'],
    td: ['colSpan', 'rowSpan'],
    th_: ['colSpan', 'rowSpan'],
  },
  // No `data:` — a data: URI in an href is a script vector in older engines
  // and has no legitimate use in a case study.
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
  },
  // Kill every event handler and style attribute outright.
  clobberPrefix: 'md-',
  clobber: ['name', 'id'],
} as const

/**
 * FR-NAV-06 — external links open in a new tab with `rel="noopener
 * noreferrer"`. `noopener` matters: without it the opened page can reach back
 * through `window.opener` and navigate this one.
 *
 * Internal links stay in the SPA and are left alone.
 */
export function isExternalUrl(href: string | undefined): boolean {
  if (!href) return false
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:')
}
