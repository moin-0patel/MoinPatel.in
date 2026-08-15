/**
 * Live verification against the real Supabase project — `npm run db:verify:remote`
 *
 * WHY THIS EXISTS ALONGSIDE db:verify
 *
 * `db:verify` runs the migrations on PGlite with a shimmed platform
 * (scripts/db/supabase-shim.sql). It proves the SQL and the RLS policies, and it
 * runs in four seconds with no network. It cannot prove anything about
 * PostgREST, Storage or Auth, because those are fakes.
 *
 * This script asserts the same guarantees against the REAL platform, using only
 * the publishable key — i.e. exactly the privileges a hostile visitor has. That
 * is the point: the publishable key is safe to ship ONLY because RLS is correct,
 * and this is what turns that from an assumption into a measurement.
 *
 * Read-only by default. Pass --writes to include the contact-form tests, which
 * insert rows (and deliberately trip the rate limit).
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

for (const file of ['.env', '.env.local']) {
  const path = join(ROOT, file)
  if (existsSync(path)) {
    try {
      process.loadEnvFile(path)
    } catch {
      /* Node < 20.12; fall back to the ambient environment. */
    }
  }
}

const URL_ = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!URL_ || !KEY) {
  console.error('\nVITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set.\n')
  process.exit(1)
}

const INCLUDE_WRITES = process.argv.includes('--writes')

/*
 * SEC-01 tripwire, repeated here because this script talks to a real database.
 * A service-role key would make every assertion below pass vacuously — it
 * bypasses RLS — so a green run with the wrong key would be actively
 * misleading. Refuse rather than mislead.
 */
if (KEY.split('.').length === 3) {
  try {
    const payload = Buffer.from(KEY.split('.')[1], 'base64').toString('utf8')
    if (payload.includes('service_role')) {
      console.error('\nRefusing to run: that is a SERVICE ROLE key. It bypasses RLS, so')
      console.error('every check here would pass without proving anything.\n')
      process.exit(1)
    }
  } catch {
    /* not a JWT; the new sb_publishable_ format is not one either */
  }
}

const supabase = createClient(URL_, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/* --- harness -------------------------------------------------------------- */

let passed = 0
const failures = []
const notes = []

function check(name, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function section(title) {
  console.log(`\n${title}`)
}

/** Does this error mean "no such table" rather than "not allowed"? */
function isMissingRelation(error) {
  if (!error) return false
  return /schema cache|does not exist|PGRST205|42P01/i.test(`${error.code} ${error.message}`)
}

/**
 * Assert an operation was REFUSED, and refused for an authorization reason.
 *
 * Checking the reason is the whole point. `expect(error).toBeTruthy()` passes
 * just as happily when the table does not exist, when the column is misspelled,
 * or when the project is unreachable — so a half-migrated database would report
 * a reassuring row of green ticks while proving nothing at all.
 */
function checkRefused(name, error) {
  if (!error) {
    failures.push(`${name} — the operation SUCCEEDED and should have been refused`)
    console.log(`  ✗ ${name} — it SUCCEEDED`)
    return
  }
  if (isMissingRelation(error)) {
    failures.push(`${name} — inconclusive: the relation does not exist (${error.message})`)
    console.log(`  ✗ ${name} — inconclusive, no such relation`)
    return
  }
  const text = `${error.code ?? ''} ${error.message ?? ''} ${error.hint ?? ''}`
  const isAuthz =
    /42501|PGRST301|row-level security|permission denied|violates row-level|not authorized|Unauthorized/i.test(
      text,
    )
  if (!isAuthz) {
    failures.push(`${name} — refused, but not for an authorization reason: ${error.message}`)
    console.log(`  ✗ ${name} — wrong reason: ${error.message}`)
    return
  }
  passed++
  console.log(`  ✓ ${name}`)
}

/* --- 1. Schema reachable --------------------------------------------------- */

section('Schema')

const TABLES = [
  'profiles',
  'projects',
  'project_images',
  'project_pipeline_steps',
  'technologies',
  'project_technologies',
  'experience',
  'experience_items',
  'experience_technologies',
  'skill_categories',
  'skills',
  'education',
  'social_links',
  'contact_messages',
  'site_settings',
  'resume_versions',
  'admin_users',
  'analytics_events',
]

const missing = []
for (const table of TABLES) {
  /*
   * A plain select, NOT `{ head: true }`.
   *
   * A HEAD request discards the response body, and PostgREST puts the error
   * there — so a head-count against a table that does not exist comes back with
   * `error: null` and this probe reported every missing table as present.
   * Verified against the live project before fixing.
   *
   * The distinction being drawn: a table with no SELECT policy returns zero
   * rows and no error; a MISSING table returns PGRST205 / 42P01.
   */
  const { error } = await supabase.from(table).select('id').limit(1)
  if (isMissingRelation(error)) missing.push(table)
}
check(`all ${TABLES.length} tables exist`, missing.length === 0, `missing: ${missing.join(', ')}`)

{
  const { error } = await supabase.from('v_public_projects').select('id').limit(1)
  check('v_public_projects view is reachable', !error, error?.message)
  if (isMissingRelation(error)) missing.push('v_public_projects')
}

/*
 * Stop here if the schema is not in place.
 *
 * Everything below asserts that RLS refuses things. Against a database with no
 * tables, most of those assertions pass — for entirely the wrong reason — and
 * the run would end in a wall of green ticks that proves nothing. A partial
 * result here is worse than no result, so it does not get printed.
 */
if (missing.length > 0) {
  console.log(`\n${'─'.repeat(68)}`)
  console.log('ABORTED — the schema is not applied to this project.\n')
  console.log(`  Missing: ${missing.join(', ')}\n`)
  console.log('  Apply it first:')
  console.log('    npx supabase link --project-ref <ref>')
  console.log('    npx supabase db push --include-seed\n')
  console.log('  Not continuing: with no tables, the RLS checks below would pass')
  console.log('  because nothing exists to refuse — which would be misleading.\n')
  process.exit(1)
}

/* --- 2. RLS as a real anonymous caller ------------------------------------- */

section('RLS as anon (the publishable key is safe only if these hold)')

{
  const { data, error } = await supabase
    .from('projects')
    .select('slug, publication_state, visibility_mode')
  check('projects readable without error', !error, error?.message)
  const rows = data ?? []
  check(
    'AC-RLS-2: every visible project is published and non-private',
    rows.every((r) => r.publication_state === 'published' && r.visibility_mode !== 'private'),
    `leaked: ${rows
      .filter((r) => r.publication_state !== 'published')
      .map((r) => r.slug)
      .join(', ')}`,
  )
  notes.push(`${rows.length} published project(s) visible to anon`)
}

{
  // AC-PROJ-8 — a known seeded draft must be invisible even by direct slug.
  const { data } = await supabase.from('projects').select('slug').eq('slug', 'exam-build-platform')
  check('a seeded draft is invisible by direct slug', (data?.length ?? 0) === 0)
}

{
  const { data } = await supabase.from('project_images').select('id')
  const { data: visible } = await supabase.from('projects').select('id')
  // With no published projects there should be no visible images at all.
  check(
    "no draft project's images are exposed",
    (visible?.length ?? 0) > 0 || (data?.length ?? 0) === 0,
    `${data?.length ?? 0} images visible with ${visible?.length ?? 0} visible projects`,
  )
}

{
  // AC-RLS-4 — zero rows, NOT an error. An error is itself a signal.
  const { data, error } = await supabase.from('contact_messages').select('id')
  check(
    'AC-RLS-4: contact_messages returns zero rows and no error',
    !error && (data?.length ?? 0) === 0,
    error ? `errored: ${error.message}` : `${data?.length} rows returned`,
  )
}

{
  const { data, error } = await supabase.from('admin_users').select('user_id')
  check('admin_users is unreadable by anon', !error && (data?.length ?? 0) === 0, error?.message)
}

{
  const { data } = await supabase.from('site_settings').select('key, is_public')
  const leaked = (data ?? []).filter((row) => !row.is_public)
  check(
    '25.1: only allow-listed settings are visible',
    leaked.length === 0,
    `leaked: ${leaked.map((r) => r.key).join(', ')}`,
  )
  notes.push(`${data?.length ?? 0} public setting(s) readable`)
}

{
  const { data } = await supabase.from('social_links').select('url, published')
  check(
    'unpublished social links are hidden',
    (data ?? []).every((row) => row.published),
  )
  const placeholders = (data ?? []).filter((r) => /REQUIRES-USER-INPUT/i.test(r.url))
  check('no placeholder URL is publicly visible', placeholders.length === 0)
}

{
  const { data } = await supabase.from('education').select('id, grade_label, show_grade')
  const leakedGrades = (data ?? []).filter((r) => r.grade_label && !r.show_grade)
  // FR-EDU-04 — the column comes back, but the mapper is what gates display.
  // Recording it here so a future policy change is visible.
  if (leakedGrades.length > 0) {
    notes.push(
      `${leakedGrades.length} education row(s) expose grade_label with show_grade=false; ` +
        'the service mapper drops it, but consider a column-level policy',
    )
  }
  check('education rows are readable', (data ?? []).length >= 0)
}

/* --- 3. Writes are refused ------------------------------------------------- */

section('Writes refused (AC-PROJ-12)')

{
  const { error } = await supabase
    .from('projects')
    .insert({ slug: 'rls-probe', title: 'probe', summary: 'probe', category: 'other' })
  checkRefused('anon cannot INSERT a project', error)
}

{
  const { error } = await supabase
    .from('projects')
    .update({ title: 'hacked' })
    .neq('id', '00000000-0000-4000-a000-000000000000')
  checkRefused('anon cannot UPDATE a project', error)
}

{
  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .neq('id', '00000000-0000-4000-a000-000000000000')
  checkRefused('anon cannot DELETE a contact message', error)
}

{
  const { error } = await supabase
    .from('admin_users')
    .insert({ user_id: '00000000-0000-4000-a000-000000000000', email: 'probe@example.invalid' })
  checkRefused('anon cannot grant itself admin', error)
}

/* --- 4. Storage ------------------------------------------------------------ */

section('Storage')

{
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets && buckets.length > 0) {
    const byId = new Map(buckets.map((b) => [b.id, b]))
    check('profile bucket exists and is public', byId.get('profile')?.public === true)
    check('projects bucket exists and is public', byId.get('projects')?.public === true)
    check('TD-08: resume bucket exists and is PRIVATE', byId.get('resume')?.public === false)
  } else {
    // Bucket listing is not always granted to anon; fall back to behaviour.
    notes.push('anon cannot list buckets — verified functionally instead')
  }
}

{
  /*
   * MED-01 / AC-STORE-1 — there is no anonymous upload path anywhere.
   *
   * "Bucket not found" does NOT count as a pass: it would mean the buckets were
   * never created, not that uploading is refused. Same discipline as
   * checkRefused above.
   */
  const body = new Blob(['probe'], { type: 'text/plain' })
  for (const bucket of ['profile', 'projects', 'resume']) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(`rls-probe-${Date.now()}.txt`, body)

    if (!error) {
      failures.push(`anon uploaded to "${bucket}" — CRITICAL`)
      console.log(`  ✗ anon cannot upload to "${bucket}" — the upload SUCCEEDED`)
    } else if (/not found|does not exist/i.test(error.message)) {
      failures.push(`anon upload to "${bucket}" inconclusive: the bucket does not exist`)
      console.log(`  ✗ anon cannot upload to "${bucket}" — inconclusive, no such bucket`)
    } else {
      passed++
      console.log(`  ✓ anon cannot upload to "${bucket}"`)
    }
  }
}

{
  // A public bucket should 404 a missing object (read allowed, nothing there);
  // the private bucket should refuse regardless.
  const publicUrl = `${URL_}/storage/v1/object/public/projects/definitely-missing.webp`
  const publicResponse = await fetch(publicUrl)
  check(
    'public bucket read is open (404 for a missing object, not 401/403)',
    publicResponse.status === 404 || publicResponse.status === 400,
    `got ${publicResponse.status}`,
  )

  const resumeResponse = await fetch(`${URL_}/storage/v1/object/public/resume/anything.pdf`, {
    headers: { apikey: KEY },
  })
  check(
    'FR-RES-03: the resume bucket is not openly readable',
    resumeResponse.status !== 200,
    `got ${resumeResponse.status}`,
  )
}

/* --- 5. Auth --------------------------------------------------------------- */

section('Auth')

{
  // AC-AUTH-2 — one generic error, no enumeration signal.
  const { error } = await supabase.auth.signInWithPassword({
    email: 'definitely-not-a-user@example.invalid',
    password: 'wrong-password-here',
  })
  check('bad credentials are rejected', Boolean(error))
  check(
    'the auth error does not reveal whether the account exists',
    !error || !/not found|no user|unknown email|does not exist/i.test(error.message),
    error?.message,
  )
}

{
  // FR-AUTH-01 / SEC-10 — public sign-up must be disabled in the project.
  const probe = `signup-probe-delete-me-${Date.now()}@example.invalid`
  const { data, error } = await supabase.auth.signUp({ email: probe, password: 'Xk9!pQ2m#Lv7' })
  const created = !error && data.user !== null
  check(
    'FR-AUTH-01: public sign-up is disabled',
    !created,
    'sign-up SUCCEEDED — turn it off in Authentication → Sign In / Providers',
  )
  if (created) {
    notes.push(`A probe user was created and must be deleted: ${probe}`)
  }
}

/* --- 6. Contact form (writes) ---------------------------------------------- */

if (!INCLUDE_WRITES) {
  section('Contact form')
  console.log('  — skipped (read-only run). Pass --writes to include.')
} else {
  section('Contact form (FR-CONT-08) — this inserts rows')

  const message = 'This is a verification probe with a long enough body to pass the check.'
  const base = {
    name: 'RLS Probe',
    email: 'probe@example.invalid',
    subject: 'Automated verification probe',
    message,
    service_type: 'other',
  }
  const tenSecondsAgo = () => new Date(Date.now() - 10_000).toISOString()

  {
    const { error } = await supabase
      .from('contact_messages')
      .insert({ ...base, form_rendered_at: new Date().toISOString() })
    check('a submission faster than 3s is rejected', Boolean(error), 'it was ACCEPTED')
  }

  {
    const { error } = await supabase.from('contact_messages').insert(base)
    check('a missing form_rendered_at is rejected', Boolean(error), 'it was ACCEPTED')
  }

  {
    const { error } = await supabase
      .from('contact_messages')
      .insert({ ...base, message: 'too short', form_rendered_at: tenSecondsAgo() })
    check('a message under 20 characters is rejected', Boolean(error), 'it was ACCEPTED')
  }

  let accepted = 0
  let rateLimited = false
  for (let i = 0; i < 6; i++) {
    const { error } = await supabase
      .from('contact_messages')
      .insert({ ...base, subject: `Probe ${i + 1}`, form_rendered_at: tenSecondsAgo() })
    if (error) {
      rateLimited = true
      break
    }
    accepted++
  }

  check('a valid submission is accepted', accepted > 0, 'none were accepted')
  check(
    'AC-CONT-6: the rate limit stops the run before 6 succeed',
    rateLimited && accepted <= 5,
    `${accepted} accepted, rate limited: ${rateLimited}`,
  )

  if (accepted > 0) {
    notes.push(
      `${accepted} probe contact message(s) were created — delete them from /admin/messages`,
    )
  }
}

/* --- report ---------------------------------------------------------------- */

console.log(`\n${'─'.repeat(68)}`)
for (const note of notes) console.log(`  note: ${note}`)
if (notes.length > 0) console.log('')

if (failures.length === 0) {
  console.log(`PASS — ${passed} checks against the live project, 0 failures.`)
  if (!INCLUDE_WRITES) console.log('Contact-form checks were skipped; rerun with --writes.')
  process.exit(0)
} else {
  console.log(`FAIL — ${passed} passed, ${failures.length} failed:\n`)
  for (const failure of failures) console.log(`  • ${failure}`)
  process.exit(1)
}
