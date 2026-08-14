/**
 * Build-time prerender + sitemap — PRD TD-02, SEO-05, SEO-06, R-01.
 *
 * THE PROBLEM THIS SOLVES
 *
 * A client-rendered SPA serves the same empty HTML shell for every route. The
 * <SEO> component sets the right tags, but it sets them with JavaScript.
 * Google executes JavaScript; LinkedIn, WhatsApp, Slack and X do NOT. So a
 * project link shared into any of those shows the site-wide default preview
 * rather than that project's own title, description and image.
 *
 * For a portfolio, sharing project links IS the distribution channel. R-01
 * rates that High impact and High likelihood if unaddressed, and the PRD is
 * explicit that it is "a real defect, not a theoretical one".
 *
 * WHAT THIS DOES
 *
 * After `vite build`, it fetches the published projects with the publishable
 * key and writes one static HTML file per route — the built SPA shell with
 * that route's meta tags baked into the <head>. A crawler reads the tags
 * without running anything; a browser hydrates into the SPA as normal.
 *
 * Migrating to Next.js was rejected for V1 (TD-02): it restructures the whole
 * project for a benefit prerendering already delivers at this content volume.
 *
 * KNOWN GAP
 *
 * Content published from the admin appears in the app immediately, but its
 * prerendered HTML only refreshes on the next build. A Vercel Deploy Hook
 * fired from the publish action closes that window and is P2.
 */

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')

/*
 * Vite loads .env files for the CLIENT bundle, not for Node scripts, so this
 * process would otherwise see no VITE_* variables during a local build and
 * silently skip every project route.
 *
 * Same precedence Vite uses: .env.local overrides .env. On Vercel neither file
 * exists and the variables come from the host environment, which is why the
 * existing value always wins.
 */
for (const file of ['.env', '.env.local']) {
  const path = join(ROOT, file)
  if (existsSync(path)) {
    try {
      process.loadEnvFile(path)
    } catch {
      // Node < 20.12 has no loadEnvFile. The build still works; it just falls
      // back to whatever is already in the environment.
    }
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const SITE_URL = (process.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/+$/, '')

const SITE_NAME = 'Moin Patel'
const DEFAULT_TITLE = 'Moin Patel — AI Developer & AI Automation Executive'
const DEFAULT_DESCRIPTION =
  'Building AI-powered systems that automate work, save time, and reduce business costs.'

/** Static public routes. `/404` and `/500` are noindex and are not listed. */
const STATIC_ROUTES = [
  { path: '/', title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, priority: '1.0' },
  {
    path: '/about',
    title: 'About · Moin Patel',
    description:
      'AI Developer and AI Automation Executive in Surat, building systems that replace manual business processes.',
    priority: '0.8',
  },
  {
    path: '/experience',
    title: 'Experience · Moin Patel',
    description: "Roles, responsibilities and the tools used in each — Moin Patel's experience.",
    priority: '0.7',
  },
  {
    path: '/projects',
    title: 'Projects · Moin Patel',
    description:
      'Case studies of AI automation systems, internal web applications and business process automation.',
    priority: '0.9',
  },
  {
    path: '/skills',
    title: 'Skills · Moin Patel',
    description: 'Programming, AI and automation, and business tools.',
    priority: '0.6',
  },
  {
    path: '/contact',
    title: 'Contact · Moin Patel',
    description: 'Describe a manual process worth automating.',
    priority: '0.8',
  },
  {
    path: '/resume',
    title: 'Resume · Moin Patel',
    description: 'View and download the current resume.',
    priority: '0.6',
  },
]

/** Escape for an HTML attribute value. Titles and summaries are author input. */
function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Escape for XML text content in the sitemap. */
const escapeXml = escapeAttr

function publicStorageUrl(bucket, path) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  if (!SUPABASE_URL) return null
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, '')}`
}

/**
 * Fetch published projects straight from PostgREST rather than through
 * supabase-js: the build script needs one GET, and pulling a 217 KB client in
 * to make it would be silly.
 *
 * RLS does the filtering. The predicate is repeated in the query anyway
 * (API-02, FE-05) so the intent is readable at the call site.
 */
async function fetchPublishedProjects() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      '\n  ⚠  VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set.\n' +
        '     Prerendering static routes only — project pages will NOT have their own\n' +
        '     link previews, which is exactly the R-01 defect this step exists to fix.\n',
    )
    return null
  }

  const params = new URLSearchParams({
    select:
      'slug,title,summary,seo_title,seo_description,cover_image_path,og_image_path,updated_at,visibility_mode',
    publication_state: 'eq.published',
    visibility_mode: 'neq.private',
    order: 'sort_order.asc',
  })

  const response = await fetch(`${SUPABASE_URL}/rest/v1/projects?${params.toString()}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch projects for prerendering: ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Strip every SEO tag from the shell, so injection always starts from a clean
 * <head>.
 *
 * This is what makes the script IDEMPOTENT, and it is not theoretical. The
 * template is read from `dist/index.html`, which this script also overwrites
 * with the homepage's tags. Running it a second time — a re-run after a failed
 * deploy, or anyone invoking it directly — would otherwise use an
 * already-prerendered homepage as the template for every route: `/projects`
 * would inherit the homepage's canonical URL and og:type, and the og:* tags
 * would accumulate one duplicate set per run.
 *
 * Replacing rather than appending also matters on the first pass: two <title>
 * elements leave the crawler to pick one, and it is not obliged to pick ours.
 */
function stripSeoTags(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '')
}

/** Inject this route's tags into a cleaned shell. */
function buildHtml(shell, { title, description, canonical, image, type = 'website' }) {
  const tags = [
    `<title>${escapeAttr(title)}</title>`,
    `<meta name="description" content="${escapeAttr(description)}" />`,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta property="og:type" content="${escapeAttr(type)}" />`,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta property="og:site_name" content="${escapeAttr(SITE_NAME)}" />`,
    `<meta property="og:locale" content="en_GB" />`,
    image ? `<meta property="og:image" content="${escapeAttr(image)}" />` : null,
    // SEO-03 — summary_large_image only when there is actually an image to
    // show; otherwise the card renders as a large empty box.
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
    image ? `<meta name="twitter:image" content="${escapeAttr(image)}" />` : null,
  ]
    .filter(Boolean)
    .join('\n    ')

  return stripSeoTags(shell).replace('</head>', `  ${tags}\n  </head>`)
}

async function writeRoute(routePath, html) {
  // '/' -> dist/index.html; '/about' -> dist/about/index.html. Static hosts
  // serve the latter for /about without any rewrite rule.
  const target =
    routePath === '/' ? join(DIST, 'index.html') : join(DIST, routePath, 'index.html')
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, html, 'utf8')
}

function buildSitemap(entries) {
  const urls = entries
    .map(
      ({ loc, lastmod, priority }) =>
        `  <url>\n` +
        `    <loc>${escapeXml(loc)}</loc>\n` +
        (lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>\n` : '') +
        (priority ? `    <priority>${priority}</priority>\n` : '') +
        `  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

/* --- run ------------------------------------------------------------------ */

console.log('\nPrerendering routes and generating sitemap…')

if (SITE_URL.includes('localhost')) {
  console.warn(
    '  ⚠  VITE_SITE_URL is still localhost. Canonical URLs and the sitemap will be\n' +
      '     wrong in production. Q-11 (the domain) must be answered before launch.',
  )
}

const shell = await readFile(join(DIST, 'index.html'), 'utf8')
const sitemapEntries = []

// --- static routes ---------------------------------------------------------
for (const route of STATIC_ROUTES) {
  const canonical = `${SITE_URL}${route.path === '/' ? '' : route.path}`
  await writeRoute(
    route.path,
    buildHtml(shell, {
      title: route.title,
      description: route.description,
      canonical,
      image: null,
      type: route.path === '/' ? 'profile' : 'website',
    }),
  )
  sitemapEntries.push({ loc: canonical || SITE_URL, priority: route.priority })
}
console.log(`  ✓ ${STATIC_ROUTES.length} static routes`)

// --- project routes --------------------------------------------------------
let projects = null
try {
  projects = await fetchPublishedProjects()
} catch (error) {
  // A build must not fail because the database was briefly unreachable — the
  // SPA still works, only the previews degrade. Loud, but not fatal.
  console.error(`  ✗ ${String(error.message ?? error)}`)
  console.error('    Continuing with static routes only.')
}

if (projects) {
  // SEO-06 / hasCaseStudyPage: only modes that actually render a case study.
  // Listing a github_only project would send crawlers to a 404.
  const withCaseStudy = projects.filter(
    (p) => p.visibility_mode === 'full' || p.visibility_mode === 'case_study_only',
  )

  for (const project of withCaseStudy) {
    const canonical = `${SITE_URL}/projects/${project.slug}`
    // SEO-04 resolution order: project OG image -> project cover -> none.
    const image =
      publicStorageUrl('projects', project.og_image_path) ??
      publicStorageUrl('projects', project.cover_image_path)

    await writeRoute(
      `/projects/${project.slug}`,
      buildHtml(shell, {
        // SEO-02 — falls back to title/summary when the SEO fields are unset.
        title: project.seo_title ?? `${project.title} · Moin Patel`,
        description: project.seo_description ?? project.summary,
        canonical,
        image,
        type: 'article',
      }),
    )

    sitemapEntries.push({
      loc: canonical,
      lastmod: project.updated_at ? String(project.updated_at).slice(0, 10) : undefined,
      priority: '0.9',
    })
  }

  console.log(`  ✓ ${withCaseStudy.length} project routes`)
  if (projects.length > withCaseStudy.length) {
    console.log(
      `    (${projects.length - withCaseStudy.length} published project(s) skipped — no case-study page for their visibility mode)`,
    )
  }
  if (projects.length === 0) {
    console.warn(
      '  ⚠  No published projects. The site will ship with an empty /projects page (R-11).',
    )
  }
}

// --- sitemap + robots ------------------------------------------------------
await writeFile(join(DIST, 'sitemap.xml'), buildSitemap(sitemapEntries), 'utf8')
console.log(`  ✓ sitemap.xml (${sitemapEntries.length} URLs)`)

// SEO-07 — robots.txt ships with a placeholder host; the real one is only
// known at build time from VITE_SITE_URL.
const robots = await readFile(join(DIST, 'robots.txt'), 'utf8')
await writeFile(
  join(DIST, 'robots.txt'),
  robots.replace(/^Sitemap:.*$/m, `Sitemap: ${SITE_URL}/sitemap.xml`),
  'utf8',
)
console.log('  ✓ robots.txt sitemap URL')

console.log('')
