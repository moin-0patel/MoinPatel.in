# Deployment

PRD Section 42. This file documents what `vercel.json` does and why, plus the
first-release sequence.

---

## Hosting model

Static output from `npm run build`, served by Vercel.

| Setting | Value | Why |
|---|---|---|
| `buildCommand` | `npm run build` | Runs typecheck → Vite build → prerender + sitemap |
| `outputDirectory` | `dist` | DEP-03 |
| `cleanUrls` | `true` | `/about` serves `dist/about/index.html` without the `.html` |
| `rewrites` | `/(.*)` → `/index.html` | DEP-04 |

**The rewrite does not defeat the prerender.** Vercel checks the filesystem
first: a request for `/projects/exam-build-platform` finds
`dist/projects/exam-build-platform/index.html` and serves that prerendered file,
tags and all. The rewrite is the fallback for paths with no file — a client-side
route, or a genuine 404 that the SPA renders itself.

---

## Prerendering (TD-02, R-01)

`scripts/prerender.mjs` runs after the Vite build. It fetches published projects
with the publishable key and writes one static HTML file per route, with that
route's `<title>`, description, canonical and Open Graph tags baked into `<head>`.

This exists because Google executes JavaScript and **LinkedIn, WhatsApp, Slack
and X do not**. Without it, every shared project link shows the site-wide default
preview instead of that project's own title, description and image. For a
portfolio, sharing project links *is* the distribution channel — R-01 rates it
high impact and high likelihood.

The script is idempotent: it strips all SEO tags from the shell before injecting,
so re-running it cannot compound duplicate `og:` tags or leak the homepage's
canonical URL onto another route.

**Known gap.** Content published from `/admin` appears in the app immediately,
but its prerendered HTML only refreshes on the next build. A Vercel Deploy Hook
fired from the publish action closes that window (P2).

**Degradation.** With no `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`,
or with the database unreachable, the script warns loudly and emits static routes
only. The build does not fail — the SPA still works, only the previews degrade.

---

## Security headers (SEC-08)

| Header | Value | Note |
|---|---|---|
| `Content-Security-Policy` | see `vercel.json` | Details below |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `X-Frame-Options` | `DENY` | Belt and braces with `frame-ancestors 'none'` |
| `Permissions-Policy` | camera, microphone, geolocation denied | |
| `Strict-Transport-Security` | 2 years, preload | SEC-09 — **enable only once the domain is stable**; a preload entry is slow to undo |

### CSP notes

- `script-src 'self'` with **no** `unsafe-inline` or `unsafe-eval`. The app ships
  no inline scripts; Vite emits a module tag with a `src`.
- `style-src` allows `'unsafe-inline'` for one reason: the boot shell in
  `index.html` (PRD 39) is an inline `<style>` block, deliberately inlined so the
  first paint costs no extra request. Hashing it would break on every edit to
  that block. If inline styles are removed later, tighten this.
- `connect-src` is scoped to `*.supabase.co` / `*.supabase.in` rather than a
  single project URL, because `vercel.json` cannot interpolate an environment
  variable. Pin it to the exact project origin once the project ref is fixed —
  that is a genuine tightening, not cosmetic.
- `object-src 'none'`, `base-uri 'self'` and `form-action 'self'` block three
  common injection escapes that `default-src` alone does not cover.

---

## Environment variables (DEP-05)

Set per environment in the Vercel dashboard. Never in the repository.

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL` | Public by nature |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public by nature; safe **only** because RLS is correct |
| `VITE_SITE_URL` | Canonical origin, no trailing slash. Q-11 |

`SUPABASE_SERVICE_ROLE_KEY` has no place here. `src/lib/env.ts` decodes the
publishable key at startup and refuses to boot if a service-role JWT has been
pasted in (SEC-01).

---

## First production release (PRD 42)

1. Create the production Supabase project — region closest to India/Singapore (DEP-11).
2. `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. Create the owner auth user in the Supabase dashboard.
4. Insert the `admin_users` row for that user — the one documented manual SQL statement.
5. Run the content seed **once** (DEP-08). Never again; content changes go through `/admin`.
6. Disable sign-ups, raise the password minimum, enable leaked-password protection,
   restrict auth redirect URLs to the production and localhost origins (SEC-10).
7. Set the Vercel environment variables.
8. Connect the domain; choose `www` → apex or the reverse and apply it consistently.
9. Enable HSTS once the domain is confirmed stable.
10. **Verify with a logged-out browser** that drafts, private projects and
    `contact_messages` are unreachable with the anon key (AC-RLS).
11. **Paste a project URL into LinkedIn and WhatsApp** and confirm the preview
    shows that project (AC-SEO-2). This is the launch gate for R-01.

---

## DEP-13 — free-tier pausing

Supabase pauses inactive free projects. For a portfolio with sporadic traffic
that means the site can load with empty sections at the worst possible moment —
a recruiter opening the link. **This decision must be made before launch:** run
production on a paid plan, or add a scheduled keep-alive request.

---

## Rollback (DEP-12)

Revert the offending commit and redeploy. Database rollbacks are a **new forward
migration**, never an ad-hoc dashboard fix (MIG-02, MIG-06).
