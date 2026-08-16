# moin-portfolio

Personal portfolio and project case-study platform for **Moin Patel** — AI Developer / AI Automation Executive.

React 19 · TypeScript · Vite · Tailwind CSS v4 · Supabase (PostgreSQL, Auth, Storage)

> **The PRD is the source of truth.** [`docs/PRD.md`](docs/PRD.md) specifies every requirement, schema
> object and acceptance criterion. Read the relevant section before changing anything, and do not
> implement behaviour that is not specified there. Where this README and the PRD disagree, the PRD
> wins and this file is the defect.

---

## Current state

| Phase | Scope                                                                             | Status                                                                                                                                            |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Vite + React + TS scaffold, Tailwind + tokens, ESLint/Prettier, `.env.example`    | ✅ Done                                                                                                                                           |
| 2     | Supabase config, `lib/env.ts`, typed client                                       | ✅ Done                                                                                                                                           |
| 3     | Enums, tables, constraints, indexes, functions, triggers as migrations            | ✅ Done — verified by `db:verify`                                                                                                                 |
| 4     | Seed files for all nine resources                                                 | ✅ Done — verified by `db:verify`                                                                                                                 |
| 5     | RLS everywhere, `is_admin()`, all policies, storage buckets + policies            | ✅ Done — RLS behaviour verified as `anon`                                                                                                        |
| 6     | Router, providers, layouts, services, hooks, query keys, error boundaries         | ✅ Done                                                                                                                                           |
| 7     | Tokens, typography, primitives, skeletons, empty/error states                     | ✅ Done — Sheet (FR-NAV-02) and Toast shipped; Tabs unused so far                                                                                 |
| 8     | Homepage — all nine content sections, database-driven footer                      | ✅ Done — exit criteria verified in Chrome by `verify:ui`                                                                                         |
| 9     | Project index with filters; case study with pipeline diagram, gallery, sticky nav | ✅ Done                                                                                                                                           |
| 10    | `/experience`, `/skills`, `/about`                                                | ✅ Done                                                                                                                                           |
| 11    | Contact form with validation and spam controls                                    | ✅ Done                                                                                                                                           |
| 12    | Supabase Auth — login, route guard, admin membership check                        | ✅ Done — password reset (FR-AUTH-08) included                                                                                                    |
| 13    | Admin CMS                                                                         | ✅ All nine resources: dashboard, projects + editor, experience, skills, education, social links, messages, settings. Media/resume await Phase 14 |
| 14    | Storage — upload, resize, resume versions                                         | ✅ Done — client WebP resize, media browser, resume versions; verified live                                                                       |
| 15    | SEO — prerender, sitemap, robots, security headers                                | ✅ Done (needs a live DB for project routes)                                                                                                      |
| 16    | Testing                                                                           | 🟡 169 unit + 87 DB/RLS + 100 browser checks + 78 live checks. Admin-screen e2e pending                                                           |
| 17    | Deployment                                                                        | 🟡 Fully prepared and documented; not deployed (Q-11 domain open)                                                                                 |

The migrations and seed **execute cleanly and are verified** by `npm run db:verify`, which runs them
against a real PostgreSQL engine with no Docker (see below). `supabase gen types` still cannot run,
so `src/types/database.types.ts` remains hand-written — that is the one outstanding database caveat.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev
```

`src/lib/env.ts` validates the environment at startup and fails loudly with a specific message if a
variable is missing or malformed, rather than letting `undefined` propagate into a fetch.

### Verifying the database — no Docker required

```bash
npm run db:verify
```

Executes every migration and every seed file against a real PostgreSQL engine
(**PGlite** — Postgres 18 compiled to WebAssembly, in-process, no daemon), then runs 87 assertions.
`scripts/db/supabase-shim.sql` supplies the platform objects a Supabase project would already have:
the `anon`/`authenticated` roles, the `extensions` schema, `auth.users` + `auth.uid()`, and the
`storage` tables.

Because PGlite is real Postgres with real roles, the harness can `SET ROLE anon` and prove that RLS
actually hides drafts, private projects and `contact_messages` — which is the core of the PRD's
release-blocking security suite (41.3).

**What it proves:** the SQL parses and executes in dependency order; every constraint, index, trigger
and function is created; the CHECK constraints reject what they should; the seed satisfies them and
is idempotent; and RLS behaves correctly for `anon` and for an authenticated non-admin.

**What it does not prove:** anything about the Supabase platform itself — PostgREST behaviour,
Storage's own MIME/size enforcement, or Auth. Those are shimmed. This is a fast, honest first gate,
not a replacement for `supabase db reset`.

### Verifying against a live project

```bash
npm run db:verify:remote            # read-only
npm run db:verify:remote --writes   # adds the contact-form trigger tests
```

Runs the same class of assertions against a real Supabase project using **only the
publishable key** — the privilege level a hostile visitor has. That is the point: the key
is safe to ship only because RLS is correct, and this measures it rather than assuming it.
It covers PostgREST, Storage and Auth, which the PGlite shim cannot.

It aborts rather than reporting partial results if the schema is absent — with no tables,
"anon cannot insert" would pass because there is nothing to insert into, and a wall of
green ticks that proves nothing is worse than no result at all.

### Bringing up a new Supabase project

Preferred (PRD DEP-07), and required for every migration after the first:

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push --include-seed
```

For the **one-time initial bootstrap**, if you would rather not set up CLI auth: paste
`supabase/apply-all.sql` into the dashboard SQL Editor and run it. That file is generated
by `npm run db:build-apply-all`, which executes it through PGlite before writing it — so
it is proven to run before it reaches a real database. It also writes the
`supabase_migrations.schema_migrations` rows, so a later `db push` behaves correctly
instead of trying to re-apply everything (R-10).

Never hand-edit `apply-all.sql`. Regenerate it.

<details>
<summary>With Docker, if you ever add it</summary>

```bash
npx supabase start        # boots Postgres, Auth, Storage, Studio
npm run db:reset          # applies every migration, then the seed files in order
npm run db:types:local    # regenerates src/types/database.types.ts
```

</details>

### Verifying in a real browser

```bash
npm run build             # verify:ui serves dist/, so build first
npm run verify:ui
```

Drives your installed Chrome (`channel: 'chrome'` — no 300 MB Playwright download) against
the **production build** served by Vite's programmatic preview, so what is tested is the
prerendered HTML plus hydration, exactly what a visitor receives. It reads public pages as
an anonymous visitor and writes nothing.

Covers PRD Phase 8's exit criteria (43.3): Home renders correctly with an empty database,
at all eight RES-12 widths, and passes axe — plus the full FR-NAV-02 behaviour list.

Preconditions are asserted first and are fatal. That is deliberate: nearly every check
below them asserts something is _absent_ or _hidden_, and on a blank page all of those
pass. The first run proved the point by finding `/`, `/404`, `/500` and the case study
rendering as **completely blank pages** — `<Button asChild>` passed Radix `Slot` two
children and `Slot` threw on mount. That bug had been latent since Phase 7 and passed
typecheck, lint, 150 unit tests and `vite build`, because it is a runtime invariant none
of them can see.

> Scope: **Home only**. axe and the width matrix across `/projects`, `/projects/:slug`,
> `/contact` and the admin screens are PRD Phase 16, and need a published project plus
> admin credentials in the runner.

### Run everything

```bash
npm run check             # typecheck + lint + test + db:verify
```

> ⚠️ `src/types/database.types.ts` is **hand-written** to match the migrations, because
> `supabase gen types` needs CLI auth. PRD MIG-08 says that file is generated and never
> hand-edited, so this is a known deviation.
>
> `db:verify:remote` narrows it: it parses every column out of the type file and asks
> PostgREST for exactly those, so **table and column names are confirmed against the live
> schema**. Nullability, defaults and enum membership are still unverified. Run
> `npm run db:types` once a CLI link exists and treat any difference as the hand-written
> file being wrong.

Against a hosted project instead of a local stack:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase gen types typescript --linked > src/types/database.types.ts
```

---

## Scripts

| Command                      | Purpose                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                | Vite dev server                                                   |
| `npm run build`              | Typecheck, Vite build, then prerender + sitemap                   |
| `npm run preview`            | Serve the built output                                            |
| `npm run lint`               | ESLint, including the PRD layering rules                          |
| `npm run typecheck`          | `tsc -b --noEmit`                                                 |
| `npm run format`             | Prettier write                                                    |
| `npm run test`               | 150 unit tests (Vitest)                                           |
| `npm run check`              | typecheck + lint + test + db:verify                               |
| `npm run verify:ui`          | Render Home in Chrome: 8 widths, empty-DB, FR-NAV-02, axe         |
| `npm run db:verify`          | Execute all migrations + seed against PGlite and assert 87 checks |
| `npm run db:verify:remote`   | Same guarantees against the LIVE project, anon key only           |
| `npm run db:build-apply-all` | Regenerate `supabase/apply-all.sql`, the one-paste bootstrap      |
| `npm run db:reset`           | Rebuild the local database from migrations + seed (needs Docker)  |
| `npm run db:types`           | Regenerate the database types                                     |
| `npm run db:diff`            | Capture schema drift (MIG-06)                                     |

---

## Architecture

The layering is not a convention — ESLint enforces it (`eslint.config.js`):

```
pages/sections  ->  hooks  ->  services  ->  supabaseClient  ->  Supabase
     (JSX)        (cache)    (queries)      (transport)
```

- **FE-01/FE-03** — `components/`, `sections/`, `pages/` and `hooks/` cannot import
  `supabaseClient` or `@supabase/supabase-js`. Only `src/services/*` reaches transport.
- **FE-08** — `import.meta.env` is readable in `src/lib/env.ts` and nowhere else.
- **SEC-05** — `dangerouslySetInnerHTML` is banned outside the audited markdown renderer.

```
src/
├── app/          Router, providers, error boundaries, route guard
├── components/
│   ├── ui/       Primitives — no data access, no business rules
│   └── common/   Composed presentational components
├── sections/     Page sections (Phase 8+)
├── pages/        One component per route
├── layouts/      PublicLayout, AdminLayout
├── hooks/        React Query hooks + UI hooks
├── lib/          env, supabaseClient, queryClient, queryKeys, errors,
│                 slug, dates, markdown, visibility, seo, cn
├── services/     The ONLY place Supabase queries are written
├── types/        database.types (generated), domain, settings, forms
└── styles/       globals, tokens, typography
```

### Security posture

Authorisation lives in the database, not in components (Principle 6).

- RLS is enabled on **every** table in `public`, and write grants are revoked from `anon` on every
  table except `contact_messages` and `analytics_events`. Both must fail open for a leak to occur.
- Admin identity is membership in `admin_users`, checked by the `is_admin()` `SECURITY DEFINER`
  helper — never a `user_metadata` claim, which the user can edit.
- The route guard is UX only. Every write is independently rejected by RLS (FR-AUTH-07).
- The service-role key appears nowhere in `src/`, in any `VITE_`-prefixed variable, or in this repo.
  `src/lib/env.ts` decodes the publishable key at startup and refuses to boot if a service-role JWT
  has been pasted into it.

---

## Conventions

- **Migrations are forward-only and immutable once applied.** Fix a mistake with a new migration
  (MIG-02). No production schema object is ever created through the Supabase dashboard (MIG-06).
- **Never commit** `.env*` (except `.env.example`), `dist/`, or any key.
- **Never hand-edit** `src/types/database.types.ts` once it can be generated.
- Branches: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`. Conventional Commits.
- Pull requests state which PRD requirement IDs they satisfy and whether a migration is included.

### Content rules — these are not style preferences

1. **No invented numbers.** No percentage, currency figure, hours-saved or client count that Moin has
   not supplied and approved. Qualitative impact statements are the default (Principle 4,
   FR-HOME-05a, AC-CONTENT-1).
2. **No undisclosed client names.** A project with `client_disclosed = false` must not name its
   employer anywhere, including in screenshots (FR-PROJ-16).
3. **In progress means in progress**, in every surface (Principle 3).
4. **No `[REQUIRES USER INPUT]` marker ships as visible text** (AC-CONTENT-5).

---

## Open blockers

Content and launch questions are tracked in **PRD Section 49** (Q-01 … Q-25). The ones that block
work rather than polish:

| ID          | Question                                                          | Blocks                                                                             |
| ----------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Q-01        | The resume PDF itself, so every seeded fact can be verified       | Seed content — all of it is UNVERIFIED                                             |
| Q-04        | Final profile photo + alt text                                    | Hero (Phase 8)                                                                     |
| Q-06 / Q-07 | May the three projects be published, and may the client be named? | **All three projects are seeded as draft**, so `/projects` is empty until answered |
| Q-11        | Domain name                                                       | Canonical URLs, sitemap, OG, auth redirects                                        |
| Q-12        | Short and long About copy, in Moin's own words                    | About section                                                                      |
| Q-16        | Exam Build Platform: what is genuinely built vs planned           | That case study                                                                    |

Docker is deliberately not used anywhere. Migrations execute against PGlite (`db:verify`, 87 checks)
and against the live Supabase project (`db:verify:remote`, `db:verify:auth`).
