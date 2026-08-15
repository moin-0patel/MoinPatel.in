/**
 * Generate the one-paste bootstrap SQL — `npm run db:build-apply-all`
 *
 * Concatenates every migration and every seed file into `supabase/apply-all.sql`,
 * so a brand-new Supabase project can be brought up by pasting one file into the
 * dashboard SQL Editor. No CLI login, no browser OAuth, no database password.
 *
 * WHY THIS EXISTS
 *
 * `supabase db push` is the intended route (PRD DEP-07) and remains so for every
 * subsequent migration. But it needs a Supabase login and the database password —
 * a credential that bypasses every RLS policy and, per §31.2, stays on the
 * developer's machine. For the ONE-TIME initial bootstrap that is a lot of
 * friction, and the dashboard can do the same job in a single paste.
 *
 * THE CATCH THIS FILE SOLVES
 *
 * Pasting raw SQL leaves `supabase_migrations.schema_migrations` empty, so a
 * later `supabase db push` would believe nothing had been applied and try to
 * re-run all fourteen migrations against a populated database. That is the R-10
 * schema-drift risk. This generator writes the migration-history rows alongside
 * the DDL, so the CLI stays usable afterwards.
 *
 * GENERATED — never hand-edit `supabase/apply-all.sql`. If a migration changes,
 * re-run this script. The file is a second copy of the migrations and the only
 * thing keeping it honest is that it is always regenerated, never patched.
 */

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATIONS = join(ROOT, 'supabase', 'migrations')
const SEEDS = join(ROOT, 'supabase', 'seed')
const OUT = join(ROOT, 'supabase', 'apply-all.sql')

const rule = (text) => `-- ${'='.repeat(72)}\n-- ${text}\n-- ${'='.repeat(72)}`

/** `20260815090200_create_core_tables.sql` -> { version, name } */
function parseMigrationName(file) {
  const match = /^(\d{14})_(.+)\.sql$/.exec(file)
  if (!match) throw new Error(`Migration filename is not in the expected format: ${file}`)
  return { version: match[1], name: match[2] }
}

const migrationFiles = (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort()
const seedFiles = (await readdir(SEEDS)).filter((f) => f.endsWith('.sql')).sort()

if (migrationFiles.length === 0) throw new Error('No migrations found.')

const parts = []

parts.push(`-- ${'='.repeat(72)}
-- moin-portfolio — complete database bootstrap
--
-- GENERATED FILE. Do not edit.
--   Regenerate with:  npm run db:build-apply-all
--   Sources:          supabase/migrations/*.sql  +  supabase/seed/*.sql
--
-- WHAT THIS IS FOR
--   Bringing up a brand-new Supabase project in one paste, via the dashboard
--   SQL Editor. Every migration AFTER the initial bootstrap should go through
--   \`supabase db push\` as PRD DEP-07 specifies — this file is not a substitute
--   for the migration workflow, only a way to start it without a CLI login.
--
-- HOW TO RUN
--   Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
-- SAFETY
--   Wrapped in a single transaction: if anything fails, nothing is applied and
--   the database is left exactly as it was. There is no half-migrated state.
--
--   The seed is idempotent (deterministic UUIDs + ON CONFLICT DO NOTHING), so
--   re-running is safe — though per DEP-08 it should only be needed once.
--
-- WHAT IS DELIBERATELY NOT HERE
--   Nothing from scripts/db/supabase-shim.sql. That file fakes the anon and
--   authenticated roles, auth.users, and the storage tables so the migrations
--   can run on bare PostgreSQL for testing. A real Supabase project already has
--   all of them, and applying the shim would clobber platform objects.
--
-- ${migrationFiles.length} migrations, ${seedFiles.length} seed files.
-- ${'='.repeat(72)}

begin;
`)

/* --- migration history ----------------------------------------------------
 * Written FIRST so that if the transaction commits, the history is consistent
 * with the schema. The CLI creates this schema itself when it runs a push; we
 * create it defensively in case this is the very first thing to touch the
 * project.
 */
parts.push(`
${rule('Migration history bootstrap')}
--
-- Records these migrations as already applied, so a later \`supabase db push\`
-- skips them instead of re-running all of them against a populated database.
-- Without this, the dashboard route would create exactly the schema drift that
-- MIG-06 and R-10 exist to prevent.

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version    text primary key,
  statements text[],
  name       text
);

-- Older CLI versions created this table without the later columns.
alter table supabase_migrations.schema_migrations
  add column if not exists statements text[];
alter table supabase_migrations.schema_migrations
  add column if not exists name text;

insert into supabase_migrations.schema_migrations (version, name) values
${migrationFiles
  .map((file) => {
    const { version, name } = parseMigrationName(file)
    return `  ('${version}', '${name.replace(/'/g, "''")}')`
  })
  .join(',\n')}
on conflict (version) do nothing;
`)

/* --- migrations ----------------------------------------------------------- */
parts.push(`\n${rule(`Migrations (${migrationFiles.length})`)}`)

for (const file of migrationFiles) {
  const sql = await readFile(join(MIGRATIONS, file), 'utf8')
  parts.push(`\n${rule(`migration: ${file}`)}\n\n${sql.trimEnd()}\n`)
}

/* --- seed ------------------------------------------------------------------ */
parts.push(`\n${rule(`Seed data (${seedFiles.length} files)`)}`)

for (const file of seedFiles) {
  const sql = await readFile(join(SEEDS, file), 'utf8')
  parts.push(`\n${rule(`seed: ${file}`)}\n\n${sql.trimEnd()}\n`)
}

/* --- commit + schema cache reload ------------------------------------------
 * PostgREST caches the schema. Immediately after DDL it will keep answering
 * "Could not find the table 'public.x' in the schema cache" — which reads
 * exactly like the migration silently failed. NOTIFY forces the reload.
 *
 * Outside the transaction: a NOTIFY inside a transaction is not delivered until
 * commit, and we want it to fire only once the schema is actually there.
 */
parts.push(`
${rule('Commit')}

commit;

${rule('Tell PostgREST to reload its schema cache')}
--
-- Without this, the new tables can appear to be missing for up to a minute —
-- the API answers "Could not find the table in the schema cache", which looks
-- identical to the migration having failed.

notify pgrst, 'reload schema';
`)

const output = parts.join('\n')
await writeFile(OUT, output, 'utf8')

const lines = output.split('\n').length
const kb = (Buffer.byteLength(output, 'utf8') / 1024).toFixed(1)

console.log(`\nWrote supabase/apply-all.sql`)
console.log(`  ${migrationFiles.length} migrations, ${seedFiles.length} seed files`)
console.log(`  ${lines} lines, ${kb} KB`)

/* --- verify ----------------------------------------------------------------
 * Execute the generated file against real PostgreSQL (PGlite) before anyone is
 * asked to paste it into a production database.
 *
 * This is the whole reason the artifact is generated rather than assembled by
 * hand: a 2,400-line file that merely LOOKS right is not something to run
 * against someone's project. Concatenation order, the transaction wrapper and
 * the history bootstrap all get proven here first.
 *
 * The shim supplies what a real Supabase project already has and this file
 * deliberately omits — the anon/authenticated roles, auth.users, storage.
 */
console.log(`\nVerifying it executes (PGlite)…`)

const { PGlite } = await import('@electric-sql/pglite')
const { citext } = await import('@electric-sql/pglite/contrib/citext')
const { pgcrypto } = await import('@electric-sql/pglite/contrib/pgcrypto')

const db = await PGlite.create({ extensions: { citext, pgcrypto } })

try {
  await db.exec(await readFile(join(ROOT, 'scripts', 'db', 'supabase-shim.sql'), 'utf8'))
} catch (error) {
  console.error(`\n  ✗ shim failed: ${String(error?.message ?? error)}\n`)
  process.exit(1)
}

try {
  await db.exec(output)
} catch (error) {
  console.error(
    `\n  ✗ apply-all.sql FAILED to execute:\n\n    ${String(error?.message ?? error)}\n`,
  )
  console.error('  The file was written but must not be pasted anywhere until this is fixed.\n')
  process.exit(1)
}

const count = async (sql) => Number(Object.values((await db.query(sql)).rows[0] ?? {})[0])

const tables = await count(`select count(*)::int from pg_tables where schemaname = 'public'`)
const history = await count(`select count(*)::int from supabase_migrations.schema_migrations`)
const technologies = await count(`select count(*)::int from public.technologies`)
const publishedProjects = await count(
  `select count(*)::int from public.projects where publication_state = 'published'`,
)
const rlsOff = await count(
  `select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
)

await db.close()

const results = [
  ['18 public tables created', tables === 18, `${tables}`],
  [
    `${migrationFiles.length} migration-history rows`,
    history === migrationFiles.length,
    `${history}`,
  ],
  ['seed applied (13 technologies)', technologies === 13, `${technologies}`],
  ['RLS on every public table', rlsOff === 0, `${rlsOff} without RLS`],
  // AC-CONTENT: the seed must not publish anything while Q-06/Q-07 are open.
  ['no project is published', publishedProjects === 0, `${publishedProjects} published`],
]

let ok = true
for (const [label, pass, detail] of results) {
  console.log(`  ${pass ? '✓' : '✗'} ${label}${pass ? '' : ` — got ${detail}`}`)
  if (!pass) ok = false
}

if (!ok) {
  console.error('\nGenerated file is wrong. Do not paste it.\n')
  process.exit(1)
}

console.log(`\n  Verified. Paste supabase/apply-all.sql into the Supabase dashboard`)
console.log(`  SQL Editor (New query → paste → Run).\n`)
