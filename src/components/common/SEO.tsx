import { Helmet } from 'react-helmet-async'

import { canonicalUrl } from '@/lib/seo'

/**
 * SEO — PRD 35, SEO-01…SEO-09.
 *
 * Every page renders exactly one of these (30.2). It is the single place head
 * tags are written, so "does this route have a canonical?" is answerable by
 * looking at the route rather than auditing a component tree.
 *
 * On TD-02: this is a Vite SPA, so these tags are set by JavaScript. Google
 * executes JS and will see them; LinkedIn, WhatsApp, Slack and X do NOT. The
 * build-time prerender step (Phase 15) is what makes shared project links show
 * the project's own preview instead of the site default — this component
 * provides the values that step bakes into the static HTML. Without the
 * prerender, R-01 is live.
 */

export type SEOProps = {
  title: string
  description?: string
  /** Absolute URL or a storage public URL. 1200x630 (SEO-04). */
  image?: string | null
  /** Site-relative path. Query parameters are stripped (SEO-05). */
  canonicalPath?: string
  type?: 'website' | 'article' | 'profile'
  noindex?: boolean
}

export function SEO({
  title,
  description,
  image,
  canonicalPath,
  type = 'website',
  noindex = false,
}: SEOProps) {
  const canonical = canonicalPath ? canonicalUrl(canonicalPath) : undefined
  const resolvedImage = image ?? undefined

  return (
    <Helmet prioritizeSeoTags>
      {/* SEO-01: <= 60 chars is a content rule enforced by the admin publish
          gate and the seo_title CHECK constraint, not truncated here — silent
          truncation would hide the problem from whoever wrote it. */}
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* SEO-09 — admin routes must not be indexed or followed. */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* SEO-03 — Open Graph */}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={type} />
      {canonical && <meta property="og:url" content={canonical} />}
      {resolvedImage && <meta property="og:image" content={resolvedImage} />}
      <meta property="og:site_name" content="Moin Patel" />
      <meta property="og:locale" content="en_GB" />

      {/* SEO-03 — Twitter/X. summary_large_image, so the cover is the preview
          rather than a thumbnail beside the text. */}
      <meta name="twitter:card" content={resolvedImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      {resolvedImage && <meta name="twitter:image" content={resolvedImage} />}
    </Helmet>
  )
}
