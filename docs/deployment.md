# Deployment

PRD Section 42. This file documents what `vercel.json` does and why, plus the
first-release sequence.

---

## Hosting model

Static output from `npm run build`, served by Vercel.

| Setting           | Value                   | Why                                                         |
| ----------------- | ----------------------- | ----------------------------------------------------------- |
| `buildCommand`    | `npm run build`         | Runs typecheck → Vite build → prerender + sitemap           |
| `outputDirectory` | `dist`                  | DEP-03                                                      |
| `cleanUrls`       | `true`                  | `/about` serves `dist/about/index.html` without the `.html` |
| `rewrites`        | `/(.*)` → `/index.html` | DEP-04                                                      |

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
portfolio, sharing project links _is_ the distribution channel — R-01 rates it
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

| Header                      | Value                                  | Note                                                                                |
| --------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | see `vercel.json`                      | Details below                                                                       |
| `X-Content-Type-Options`    | `nosniff`                              |                                                                                     |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`      |                                                                                     |
| `X-Frame-Options`           | `DENY`                                 | Belt and braces with `frame-ancestors 'none'`                                       |
| `Permissions-Policy`        | camera, microphone, geolocation denied |                                                                                     |
| `Strict-Transport-Security` | 2 years, preload                       | SEC-09 — **enable only once the domain is stable**; a preload entry is slow to undo |

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
- `base-uri 'self'` and `form-action 'self'` block two common injection escapes
  that `default-src` alone does not cover.
- `object-src` is `'self' https://*.supabase.co`, **not** `'none'`.

  This is a deliberate, narrow relaxation and it is worth understanding before
  anyone tightens it back. `/resume` satisfies FR-RES-04 by embedding the PDF in
  an `<object>` pointed at a short-lived Supabase signed URL. Under
  `object-src 'none'` the browser blocks that element outright — and the failure
  is invisible in development, because the dev server sends no CSP at all. It
  would have appeared only in production, as a resume viewer that silently
  showed its fallback forever.

  The allow-list is still restrictive: plugin/embed content may load from this
  origin and Supabase Storage, and nowhere else. It does **not** restore the
  general `<object>` injection vector from an attacker-controlled origin.

  If the PDF embed is ever dropped in favour of a download-only flow, put this
  back to `'none'`.

---

## Environment variables (DEP-05)

Set per environment in the Vercel dashboard. Never in the repository.

| Variable                        | Notes                                                  |
| ------------------------------- | ------------------------------------------------------ |
| `VITE_SUPABASE_URL`             | Public by nature                                       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public by nature; safe **only** because RLS is correct |
| `VITE_SITE_URL`                 | Canonical origin, no trailing slash. Q-11              |

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

---

## Hosting on Render (alternative to Vercel)

`render.yaml` is a Render Blueprint that reproduces `vercel.json` — same build,
same publish directory, same six security headers, same cache rules, same SPA
fallback. The two files are kept in step deliberately: **change a header in one,
change it in the other**, or the site behaves differently depending on which
host answered.

| Setting      | Render (`render.yaml`) | Vercel (`vercel.json`) |
| ------------ | ---------------------- | ---------------------- |
| Build        | `buildCommand`         | `buildCommand`         |
| Output       | `staticPublishPath`    | `outputDirectory`      |
| SPA fallback | `routes: rewrite`      | `rewrites`             |
| Headers      | `headers[]`            | `headers[]`            |
| Pretty URLs  | automatic              | `cleanUrls: true`      |

### Steps

1. Push the branch. **Render builds from the Git remote, not from your working
   tree** — anything uncommitted is simply not deployed.
2. Render dashboard → **New** → **Blueprint** → select this repository.
3. Render reads `render.yaml` and prompts for the three `sync: false`
   variables. Supply `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and
   `VITE_SITE_URL`.
4. `VITE_SITE_URL` is the chicken-and-egg step. The URL is
   `https://<service-name>.onrender.com`, which is known the moment the service
   is named — so set it at creation. If you deploy first and set it after, you
   must **trigger a rebuild**: the value is compiled into the bundle and baked
   into the prerendered HTML, so it cannot be corrected by an env change alone.
5. Add the Render origin to Supabase → Authentication → URL Configuration
   (SEC-10), or admin sign-in redirects will fail.
6. Custom domain: add it in Render, then update `VITE_SITE_URL` to the custom
   origin and rebuild. Do not leave `VITE_SITE_URL` pointing at `.onrender.com`
   once a custom domain is live — canonicals would advertise the wrong origin
   and split the site's SEO identity across two hosts.

### Verify after the first deploy

The prerender is the thing most likely to break on a host swap, because it
depends on the platform serving a real file in preference to the SPA fallback.
Check it explicitly rather than assuming:

```sh
# Must print the PROJECT's title, not the site-wide default.
curl -s https://<your-site>/projects/exam-build-platform | grep -o '<title>[^<]*'

# Must print the production origin, never localhost.
curl -s https://<your-site>/ | grep -o '<link rel="canonical"[^>]*>'
curl -s https://<your-site>/sitemap.xml | head -5
```

If the project URL returns the site-wide title, Render is applying the `/*`
rewrite before matching the file, and the prerendered pages are being masked.
The fix is to narrow the fallback to the routes that genuinely have no file
rather than to remove it — `/admin/*` and the 404 path still need it.

Then run the R-01 launch gate from "First production release": paste a project
URL into LinkedIn and WhatsApp and confirm the preview shows that project.

### Free tier

Render's free static sites do not spin down the way free web services do, so the
DEP-13 concern above is about **Supabase** pausing, not Render. It applies
identically on either host.
