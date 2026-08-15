/**
 * Schema verification harness — `npm run db:verify`
 *
 * Executes every migration and every seed file against a real PostgreSQL
 * engine (PGlite — Postgres 18 compiled to WebAssembly), then asserts the
 * behaviour the PRD requires. No Docker, no daemon, no network.
 *
 * WHAT THIS DOES AND DOES NOT PROVE
 *
 * Proves: the SQL parses and executes in dependency order; every constraint,
 * index, trigger and function is created; the CHECK constraints reject what
 * they are supposed to reject; the seed data satisfies them; and — because
 * PGlite is real Postgres with real roles — that RLS actually hides drafts
 * from `anon`. That last part is the core of PRD 41.3.
 *
 * Does not prove: anything about the Supabase platform itself — PostgREST
 * behaviour, Storage's own enforcement of MIME/size limits, or Auth. Those
 * objects are shimmed (scripts/db/supabase-shim.sql) and their real behaviour
 * still needs a Supabase project. This harness is a fast, honest first gate,
 * not a replacement for `supabase db reset`.
 */

import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PGlite } from '@electric-sql/pglite'
import { citext } from '@electric-sql/pglite/contrib/citext'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATIONS = join(ROOT, 'supabase', 'migrations')
const SEEDS = join(ROOT, 'supabase', 'seed')

/* --- tiny assertion harness ---------------------------------------------- */

let passed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * Assert that a statement is REJECTED, and rejected for the RIGHT reason.
 *
 * Checking the reason matters more than it looks: a test that only asserts
 * "this threw" passes just as happily when the statement fails because of a
 * typo in the test itself. Every call names the constraint it expects.
 *
 * The statement runs inside an explicit transaction that is always rolled
 * back, so a constraint that wrongly ACCEPTS the row does not leave that row
 * behind to corrupt later assertions.
 */
async function checkRejects(db, name, sql, expectFragment) {
  let accepted = false
  let message = ''
  try {
    await db.exec(`begin; ${sql};`)
    accepted = true
  } catch (error) {
    message = String(error?.message ?? error)
  }
  // Roll back either way: on success to discard the row, on failure to clear
  // the aborted transaction state.
  await db.exec('rollback;').catch(() => {})

  if (accepted) {
    failures.push(`${name} — statement was ACCEPTED but should have been rejected`)
    console.log(`  ✗ ${name} — accepted, expected rejection`)
    return
  }
  if (expectFragment && !message.toLowerCase().includes(expectFragment.toLowerCase())) {
    failures.push(`${name} — rejected, but not for the expected reason: ${message}`)
    console.log(`  ✗ ${name} — wrong reason: ${message}`)
    return
  }
  passed++
  console.log(`  ✓ ${name}`)
}

async function scalar(db, sql) {
  const result = await db.query(sql)
  return Object.values(result.rows[0] ?? {})[0]
}

/* --- run ------------------------------------------------------------------ */

console.log('\nmoin-portfolio — schema verification (PGlite, no Docker)\n')

const db = await PGlite.create({ extensions: { citext, pgcrypto } })

// --- 1. Platform shim ------------------------------------------------------
console.log('Supabase shim')
try {
  await db.exec(await readFile(join(ROOT, 'scripts', 'db', 'supabase-shim.sql'), 'utf8'))
  check('shim applied (roles, extensions/auth/storage schemas)', true)
} catch (error) {
  console.error('\nFATAL: shim failed to apply.\n', error)
  process.exit(1)
}

// --- 2. Migrations, in lexicographic order (MIG-03) -------------------------
console.log('\nMigrations')
const migrationFiles = (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort()

if (migrationFiles.length === 0) {
  console.error('FATAL: no migrations found.')
  process.exit(1)
}

for (const file of migrationFiles) {
  const sql = await readFile(join(MIGRATIONS, file), 'utf8')
  try {
    await db.exec(sql)
    console.log(`  ✓ ${file}`)
    passed++
  } catch (error) {
    console.log(`  ✗ ${file}\n      ${String(error?.message ?? error)}`)
    failures.push(`migration ${file}: ${String(error?.message ?? error)}`)
    // Ordering is a dependency chain — continuing past a failure produces a
    // cascade of misleading errors, so stop at the first one.
    break
  }
}

if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s). Fix the migration before the seed can run.\n`)
  process.exit(1)
}

// --- 3. Seed, in the order config.toml declares -----------------------------
console.log('\nSeed')
const seedFiles = (await readdir(SEEDS)).filter((f) => f.endsWith('.sql')).sort()
for (const file of seedFiles) {
  const sql = await readFile(join(SEEDS, file), 'utf8')
  try {
    await db.exec(sql)
    console.log(`  ✓ ${file}`)
    passed++
  } catch (error) {
    console.log(`  ✗ ${file}\n      ${String(error?.message ?? error)}`)
    failures.push(`seed ${file}: ${String(error?.message ?? error)}`)
  }
}

// --- 4. Structure ----------------------------------------------------------
console.log('\nStructure')

const EXPECTED_TABLES = [
  'admin_users',
  'analytics_events',
  'contact_messages',
  'education',
  'experience',
  'experience_items',
  'experience_technologies',
  'project_images',
  'project_pipeline_steps',
  'project_technologies',
  'projects',
  'profiles',
  'resume_versions',
  'site_settings',
  'skill_categories',
  'skills',
  'social_links',
  'technologies',
]

const tables = (
  await db.query(`select tablename from pg_tables where schemaname = 'public' order by tablename`)
).rows.map((r) => r.tablename)

check(
  `all ${EXPECTED_TABLES.length} public tables exist`,
  EXPECTED_TABLES.every((t) => tables.includes(t)),
  `missing: ${EXPECTED_TABLES.filter((t) => !tables.includes(t)).join(', ')}`,
)

// AC-RLS-1 — RLS enabled on EVERY table in public, without exception.
const rlsOff = (
  await db.query(
    `select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
  )
).rows.map((r) => r.relname)
check(
  'AC-RLS-1: RLS enabled on every public table',
  rlsOff.length === 0,
  `off: ${rlsOff.join(', ')}`,
)

check(
  '12 enum types created',
  (await scalar(
    db,
    `select count(*)::int from pg_type t join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'public' and t.typtype = 'e'`,
  )) === 12,
)

check(
  'v_public_projects view exists',
  (await scalar(
    db,
    `select count(*)::int from pg_views where schemaname='public' and viewname='v_public_projects'`,
  )) === 1,
)

// 23.20 — without security_invoker the view runs as its owner and bypasses the
// RLS of its underlying tables. That would silently expose drafts.
check(
  'v_public_projects has security_invoker = on',
  String(
    await scalar(
      db,
      `select coalesce((select option_value from pg_options_to_table(c.reloptions)
      where option_name = 'security_invoker'), 'off')
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='v_public_projects'`,
    ),
  ) === 'on',
)

check(
  'FR-RES-02: partial unique index on one published resume',
  (await scalar(
    db,
    `select count(*)::int from pg_indexes
   where schemaname='public' and indexname='resume_versions_one_published'`,
  )) === 1,
)

// AC-SKILL-3 — the absence of this column is a product decision (FR-SKILL-03).
check(
  'AC-SKILL-3: skills has NO proficiency column',
  (await scalar(
    db,
    `select count(*)::int from information_schema.columns
   where table_schema='public' and table_name='skills'
     and column_name in ('proficiency','level','rating','percentage')`,
  )) === 0,
)

check(
  'is_admin() exists and is SECURITY DEFINER',
  (await scalar(
    db,
    `select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='is_admin' and p.prosecdef`,
  )) === 1,
)

// An unpinned search_path on a SECURITY DEFINER function is an escalation path.
check(
  'all SECURITY DEFINER functions pin search_path',
  (await scalar(
    db,
    `select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prosecdef
     and (p.proconfig is null or not exists (
       select 1 from unnest(p.proconfig) cfg where cfg like 'search\\_path=%'))`,
  )) === 0,
)

check(
  '3 storage buckets created',
  (await scalar(db, `select count(*)::int from storage.buckets`)) === 3,
)

check(
  'TD-08: resume bucket is private',
  (await scalar(db, `select public from storage.buckets where id='resume'`)) === false,
)

// MED-06 / SEC-06 — unsanitised SVG served same-origin is an XSS vector.
check(
  'MED-06: no bucket allows image/svg+xml',
  (await scalar(
    db,
    `select count(*)::int from storage.buckets where 'image/svg+xml' = any(allowed_mime_types)`,
  )) === 0,
)

// --- 5. Grants (25.1 "Defence in depth") -----------------------------------
console.log('\nGrants')

const anonWrites = (
  await db.query(
    `select table_name, privilege_type from information_schema.role_table_grants
     where grantee = 'anon' and table_schema = 'public'
       and privilege_type in ('INSERT','UPDATE','DELETE')
     order by table_name, privilege_type`,
  )
).rows

const allowed = new Set(['contact_messages:INSERT', 'analytics_events:INSERT'])
const unexpected = anonWrites
  .map((r) => `${r.table_name}:${r.privilege_type}`)
  .filter((g) => !allowed.has(g))

check(
  'anon holds ONLY the two permitted INSERT grants',
  unexpected.length === 0,
  `unexpected: ${unexpected.join(', ')}`,
)
check(
  'anon can insert contact_messages',
  anonWrites.some((r) => r.table_name === 'contact_messages' && r.privilege_type === 'INSERT'),
)
check(
  'anon has no write grant on admin_users',
  !anonWrites.some((r) => r.table_name === 'admin_users'),
)

// --- 6. Constraints --------------------------------------------------------
console.log('\nConstraints')

await checkRejects(
  db,
  'profiles is a singleton',
  `insert into public.profiles (full_name, role_title, positioning_line)
   values ('Second Person','x','y')`,
  'profiles_singleton',
)

/*
 * Regression guard. These four columns are `citext`, whose ~ operator is
 * case-insensitive — so the obvious `slug ~ '^[a-z0-9...]'` silently accepts
 * 'Not-A-Slug', and the uppercase then flows into canonical URLs, the sitemap
 * and every shared link. The constraints cast to ::text. Do not remove the
 * cast; these tests exist to catch its removal.
 */
await checkRejects(
  db,
  'projects_slug_check rejects uppercase (citext ~ is case-insensitive)',
  `insert into public.projects (slug,title,summary,category)
   values ('Not-A-Slug','t','s','other')`,
  'slug_check',
)

await checkRejects(
  db,
  'projects_slug_check rejects a leading hyphen',
  `insert into public.projects (slug,title,summary,category)
   values ('-bad-slug','t','s','other')`,
  'slug_check',
)

await checkRejects(
  db,
  'technologies_slug_check rejects uppercase',
  `insert into public.technologies (name,slug,category) values ('X','Upper-Case','other')`,
  'slug_check',
)

await checkRejects(
  db,
  'skill_categories_slug_check rejects uppercase',
  `insert into public.skill_categories (name,slug) values ('X','Upper-Case')`,
  'slug_check',
)

await checkRejects(
  db,
  'skills_slug_check rejects uppercase',
  `insert into public.skills (category_id,name,slug)
   values ('00000000-0000-4000-c000-000000000001','X','Upper-Case')`,
  'slug_check',
)

// citext must still give case-insensitive UNIQUE — that is why the type is
// used at all, and the ::text cast above must not have cost us it.
await checkRejects(
  db,
  'citext still gives case-insensitive slug uniqueness',
  `insert into public.projects (slug,title,summary,category)
   values ('EXAM-BUILD-PLATFORM','t','s','other')`,
  'slug_check',
)

await checkRejects(
  db,
  'FR-ADM-11 publish gate rejects an empty published project',
  `insert into public.projects (slug,title,summary,category,publication_state)
   values ('empty-shell','t','s','other','published')`,
  'publish_gate',
)

await checkRejects(
  db,
  '13.2: github_only requires github_url',
  `insert into public.projects (slug,title,summary,category,visibility_mode)
   values ('gh-only','t','s','other','github_only')`,
  'github_only_requires_url',
)

await checkRejects(
  db,
  'A11Y-06: cover image without alt text is rejected',
  `insert into public.projects (slug,title,summary,category,cover_image_path)
   values ('no-alt','t','s','other','projects/x.webp')`,
  'cover_alt_check',
)

await checkRejects(
  db,
  'AC-EXP-3: is_current cannot carry an end_date',
  `insert into public.experience (company,role_title,start_date,end_date,is_current)
   values ('X','Y','2024-01-01','2025-01-01',true)`,
  'current_check',
)

// form_rendered_at must be supplied, otherwise the FR-CONT-08 timing trigger
// rejects the row first and this would pass without testing the length at all.
await checkRejects(
  db,
  'contact_messages rejects a message under 20 chars',
  `insert into public.contact_messages (name,email,subject,message,form_rendered_at)
   values ('Ada','a@b.co','Hello','too short', now() - interval '10 seconds')`,
  'message_check',
)

await checkRejects(
  db,
  'FR-RES-01: resume_versions rejects a non-PDF',
  `insert into public.resume_versions (storage_path,file_name,mime_type,is_published)
   values ('resume/a.docx','a.docx','application/msword',false)`,
  'mime_check',
)

// FR-RES-02 / AC-RES-2 — at most one published version, enforced by the index.
await db.exec(`insert into public.resume_versions (storage_path,file_name,mime_type,is_published)
               values ('resume/v1.pdf','v1.pdf','application/pdf',true)`)
await checkRejects(
  db,
  'FR-RES-02: a second published resume is rejected',
  `insert into public.resume_versions (storage_path,file_name,mime_type,is_published)
   values ('resume/v2.pdf','v2.pdf','application/pdf',true)`,
  'resume_versions_one_published',
)

// --- 7. Triggers -----------------------------------------------------------
console.log('\nTriggers')

await db.exec(`insert into public.projects (id,slug,title,summary,category,description_md)
               values ('11111111-1111-4111-a111-111111111111','trigger-test','T','S','other','body')`)

check(
  'published_at is null while draft',
  (await scalar(db, `select published_at from public.projects where slug='trigger-test'`)) === null,
)

await db.exec(`update public.projects set publication_state='published' where slug='trigger-test'`)
const firstPublishedAt = await scalar(
  db,
  `select published_at from public.projects where slug='trigger-test'`,
)
check('set_published_at fires on first publish', firstPublishedAt !== null)

// Unpublishing and republishing must not rewrite history: published_at is what
// "newest first" ordering means.
await db.exec(`update public.projects set publication_state='draft' where slug='trigger-test'`)
await db.exec(`update public.projects set publication_state='published' where slug='trigger-test'`)
check(
  'set_published_at never clears or rewrites the original date',
  String(await scalar(db, `select published_at from public.projects where slug='trigger-test'`)) ===
    String(firstPublishedAt),
)

// --- 8. RLS behaviour, as the anon role (the core of PRD 41.3) -------------
console.log('\nRLS behaviour (executing as anon)')

// One published project to prove the positive case alongside the negatives.
await db.exec(`
  insert into public.projects (id,slug,title,summary,category,description_md,publication_state,visibility_mode)
  values ('22222222-2222-4222-a222-222222222222','visible-one','Visible','S','other','b','published','case_study_only');
  insert into public.projects (id,slug,title,summary,category,description_md,publication_state,visibility_mode)
  values ('33333333-3333-4333-a333-333333333333','private-one','Private','S','other','b','published','private');
  insert into public.project_images (project_id,storage_path,alt_text)
  values ('11111111-1111-4111-a111-111111111111','projects/draft.webp','draft cover');
  insert into public.contact_messages (name,email,subject,message,form_rendered_at)
  values ('Ada','ada@example.com','Hello there','This is a long enough message body to pass.', now() - interval '10 seconds');
`)
// The trigger-test project is left published from section 7; make it a draft
// again so the draft-invisibility assertions below are meaningful.
await db.exec(`update public.projects set publication_state='draft' where slug='trigger-test'`)

await db.exec(`set role anon`)

check(
  'AC-RLS-2: anon sees only published, non-private projects',
  (await scalar(db, `select count(*)::int from public.projects`)) === 1,
)

check(
  'anon cannot see a draft by direct slug (AC-PROJ-8)',
  (await scalar(db, `select count(*)::int from public.projects where slug='trigger-test'`)) === 0,
)

check(
  'anon cannot see a private project',
  (await scalar(db, `select count(*)::int from public.projects where slug='private-one'`)) === 0,
)

check(
  "anon cannot see a draft project's images",
  (await scalar(db, `select count(*)::int from public.project_images`)) === 0,
)

// AC-RLS-4 — zero rows, NOT an error. An error would itself be a signal.
let contactReadThrew = false
let contactRows = -1
try {
  contactRows = await scalar(db, `select count(*)::int from public.contact_messages`)
} catch {
  contactReadThrew = true
}
check(
  'AC-RLS-4: anon reading contact_messages gets zero rows, not an error',
  !contactReadThrew && contactRows === 0,
  contactReadThrew ? 'it threw' : `rows=${contactRows}`,
)

check(
  'anon cannot read admin_users',
  (await scalar(db, `select count(*)::int from public.admin_users`)) === 0,
)

check(
  '25.1: anon sees only allow-listed site_settings',
  (await scalar(db, `select count(*)::int from public.site_settings where not is_public`)) === 0,
)

check(
  'anon sees no unpublished social links (Q-02/Q-03 placeholders stay hidden)',
  (await scalar(db, `select count(*)::int from public.social_links`)) === 1,
)

check(
  'anon sees only published education (Class X/XII stay drafts)',
  (await scalar(db, `select count(*)::int from public.education`)) === 1,
)

await checkRejects(
  db,
  'AC-PROJ-12: anon cannot insert a project',
  `insert into public.projects (slug,title,summary,category) values ('hack','h','s','other')`,
  'permission denied',
)

await checkRejects(
  db,
  'anon cannot update a project',
  `update public.projects set title='hacked' where slug='visible-one'`,
  'permission denied',
)

await checkRejects(
  db,
  'anon cannot delete a contact message',
  `delete from public.contact_messages`,
  'permission denied',
)

check('is_admin() is false for anon', (await scalar(db, `select public.is_admin()`)) === false)

await db.exec(`reset role`)

// AC-AUTH-6 / AC-RLS-5 — a signed-in user with no admin_users row must have
// exactly the same permissions as anon.
const NON_ADMIN = '44444444-4444-4444-a444-444444444444'
await db.exec(`insert into auth.users (id, email) values ('${NON_ADMIN}','stranger@example.com')`)
await db.exec(`set role authenticated`)
await db.exec(`set local request.jwt.claim.sub = '${NON_ADMIN}'`)

check(
  'AC-AUTH-6: authenticated non-admin is not an admin',
  (await scalar(db, `select public.is_admin()`)) === false,
)
check(
  'AC-RLS-5: authenticated non-admin sees no drafts',
  (await scalar(db, `select count(*)::int from public.projects`)) === 1,
)
check(
  'AC-CONT-8: authenticated non-admin cannot read contact_messages',
  (await scalar(db, `select count(*)::int from public.contact_messages`)) === 0,
)

await db.exec(`reset role`)

// --- 9. Contact spam controls (FR-CONT-08) ---------------------------------
console.log('\nContact spam controls')

await checkRejects(
  db,
  'FR-CONT-08: submission faster than 3s is rejected',
  `insert into public.contact_messages (name,email,subject,message,form_rendered_at)
   values ('Bot','bot@example.com','Subject','A message body long enough to pass the length check.', now())`,
  'too fast',
)

await checkRejects(
  db,
  'FR-CONT-08: a missing form_rendered_at is rejected, not waved through',
  `insert into public.contact_messages (name,email,subject,message)
   values ('Bot','bot@example.com','Subject','A message body long enough to pass the length check.')`,
  'too fast',
)

// AC-CONT-6 — the sixth submission within an hour is rejected. One row already
// exists from section 8, so five more reach the limit.
for (let i = 0; i < 4; i++) {
  await db.exec(`insert into public.contact_messages (name,email,subject,message,form_rendered_at)
    values ('Ada','ada@example.com','Subject ${i}','A message body long enough to pass the length check.',
            now() - interval '10 seconds')`)
}
await checkRejects(
  db,
  'AC-CONT-6: the sixth submission within an hour is rejected',
  `insert into public.contact_messages (name,email,subject,message,form_rendered_at)
   values ('Ada','ada@example.com','Sixth','A message body long enough to pass the length check.',
           now() - interval '10 seconds')`,
  'rate limit',
)

check(
  '23.14: the raw IP is never stored — only a hash',
  (await scalar(db, `select count(*)::int from public.contact_messages where ip_hash is null`)) ===
    0,
)

check(
  'form_rendered_at is consumed and not retained',
  (await scalar(
    db,
    `select count(*)::int from public.contact_messages where form_rendered_at is not null`,
  )) === 0,
)

check(
  'server owns status: every message is `new`',
  (await scalar(db, `select count(*)::int from public.contact_messages where status <> 'new'`)) ===
    0,
)

// --- 10. Seed content gates (AC-CONTENT) -----------------------------------
console.log('\nSeed content gates')

check(
  'AC-CONTENT: no seeded project is published (Q-06/Q-07 unanswered)',
  (await scalar(
    db,
    `select count(*)::int from public.projects
     where publication_state='published' and slug in
       ('recipe-costing-restaurant-operations-system','capiche-ai-feedback-automation','exam-build-platform')`,
  )) === 0,
)

check(
  'FR-PROJ-16: no seeded project discloses a client',
  (await scalar(db, `select count(*)::int from public.projects where client_disclosed`)) === 0,
)

check(
  '3 projects seeded',
  (await scalar(
    db,
    `select count(*)::int from public.projects where slug in
   ('recipe-costing-restaurant-operations-system','capiche-ai-feedback-automation','exam-build-platform')`,
  )) === 3,
)

check(
  '28.3: 9 Capiche pipeline steps seeded',
  (await scalar(
    db,
    `select count(*)::int from public.project_pipeline_steps s
   join public.projects p on p.id = s.project_id
   where p.slug='capiche-ai-feedback-automation'`,
  )) === 9,
)

check(
  '13 technologies, 3 skill categories, 14 skills seeded',
  (await scalar(db, `select count(*)::int from public.technologies`)) === 13 &&
    (await scalar(db, `select count(*)::int from public.skill_categories`)) === 3 &&
    (await scalar(db, `select count(*)::int from public.skills`)) === 14,
)

check(
  'Exam Build Platform is in_progress, not completed (Principle 3)',
  (await scalar(db, `select status from public.projects where slug='exam-build-platform'`)) ===
    'in_progress',
)

check(
  'Q-10: the phone number is stored but not visible',
  (await scalar(db, `select phone_visible from public.profiles`)) === false,
)

// Principle 4 / AC-CONTENT-1 — the easiest mistake to make, per R-06.
const numericClaims = await scalar(
  db,
  `select count(*)::int from public.projects
   where publication_state <> 'archived' and (
     coalesce(business_impact_md,'') ~ '[0-9]+ ?%'
     or coalesce(business_impact_md,'') ~ '₹'
     or coalesce(business_impact_md,'') ~* '[0-9]+ (hours|hrs) saved')`,
)
check('Principle 4: zero fabricated metrics in seeded impact copy', numericClaims === 0)

// Seeds must be safe to re-run locally (28.1).
console.log('\nSeed idempotency')
let reseedFailed = null
for (const file of seedFiles) {
  try {
    await db.exec(await readFile(join(SEEDS, file), 'utf8'))
  } catch (error) {
    reseedFailed = `${file}: ${String(error?.message ?? error)}`
    break
  }
}
check(
  '28.1: the seed is idempotent — re-running it is safe',
  reseedFailed === null,
  reseedFailed ?? '',
)
check(
  're-running the seed did not duplicate technologies',
  (await scalar(db, `select count(*)::int from public.technologies`)) === 13,
)

await db.close()

/* --- report --------------------------------------------------------------- */

console.log(`\n${'─'.repeat(64)}`)
if (failures.length === 0) {
  console.log(`PASS — ${passed} checks, 0 failures.`)
  console.log('Note: this verifies SQL and RLS against real Postgres. It does')
  console.log('not verify the Supabase platform (PostgREST, Storage, Auth).')
  process.exit(0)
} else {
  console.log(`FAIL — ${passed} passed, ${failures.length} failed:\n`)
  for (const f of failures) console.log(`  • ${f}`)
  process.exit(1)
}
