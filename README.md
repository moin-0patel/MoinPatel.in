# moin-portfolio

Personal portfolio and project case-study platform for **Moin Patel** — AI Developer / AI Automation Executive.

React 19 · TypeScript · Vite · Tailwind CSS v4 · Supabase (PostgreSQL, Auth, Storage)

> **The PRD is the source of truth.** [`docs/PRD.md`](docs/PRD.md) specifies every requirement, schema
> object and acceptance criterion. Read the relevant section before changing anything, and do not
> implement behaviour that is not specified there. Where this README and the PRD disagree, the PRD
> wins and this file is the defect.

---

## Current state

| Phase | Scope | Status |
|---|---|---|
| 1 | Vite + React + TS scaffold, Tailwind + tokens, ESLint/Prettier, `.env.example` | ✅ Done |
| 2 | Supabase config, `lib/env.ts`, typed client | ✅ Done |
| 3 | Enums, tables, constraints, indexes, functions, triggers as migrations | ✅ Written — **not yet applied** |
| 4 | Seed files for all nine resources | ✅ Written — **not yet applied** |
| 5 | RLS everywhere, `is_admin()`, all policies, storage buckets + policies | ✅ Written — **not yet applied** |
| 6 | Router, providers, layouts, services, hooks, query keys, error boundaries | ✅ Done |
| 7 | Tokens, typography, primitives, skeletons, empty/error states | 🟡 Core done; Dialog/Sheet/Toast/Tabs pending |
| 8–17 | Homepage, projects, CV pages, contact, auth, admin CMS, storage, SEO, testing, deployment | ⬜ Not started |

**No migration has been executed against a database.** Docker is not installed on this machine, so
`supabase start` and `supabase db reset` cannot run, and `supabase gen types` cannot be executed
either. The SQL is written and reviewed but **unverified** — see [Verifying the database](#verifying-the-database).

---

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev
```

`src/lib/env.ts` validates the environment at startup and fails loudly with a specific message if a
variable is missing or malformed, rather than letting `undefined` propagate into a fetch.

### Verifying the database

Requires **Docker Desktop**, which is a prerequisite of the Supabase local stack.

```bash
npx supabase start        # boots Postgres, Auth, Storage, Studio
npm run db:reset          # applies every migration, then the seed files in order
npm run db:types          # regenerates src/types/database.types.ts — see the warning below
```

> ⚠️ `src/types/database.types.ts` is currently **hand-written** to match the migrations, because the
> generator needs a running database. PRD MIG-08 says that file is generated and never hand-edited.
> Run `npm run db:types` the moment a database is reachable; treat any difference the generator
> produces as the hand-written file being wrong.

Against a hosted project instead of a local stack:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase gen types typescript --linked > src/types/database.types.ts
```

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the built output |
| `npm run lint` | ESLint, including the PRD layering rules |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run format` | Prettier write |
| `npm run db:reset` | Rebuild the local database from migrations + seed |
| `npm run db:types` | Regenerate the database types |
| `npm run db:diff` | Capture schema drift (MIG-06) |

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

| ID | Question | Blocks |
|---|---|---|
| Q-01 | The resume PDF itself, so every seeded fact can be verified | Seed content — all of it is UNVERIFIED |
| Q-04 | Final profile photo + alt text | Hero (Phase 8) |
| Q-06 / Q-07 | May the three projects be published, and may the client be named? | **All three projects are seeded as draft**, so `/projects` is empty until answered |
| Q-11 | Domain name | Canonical URLs, sitemap, OG, auth redirects |
| Q-12 | Short and long About copy, in Moin's own words | About section |
| Q-16 | Exam Build Platform: what is genuinely built vs planned | That case study |

Plus one environment blocker: **Docker is not installed**, so no migration has been executed.
