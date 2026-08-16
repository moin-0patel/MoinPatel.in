/**
 * Authenticated verification against the live project.
 *
 *   npm run db:verify:auth                  run everything, then CLEAN UP (default)
 *   npm run db:verify:auth -- --keep        run everything, KEEP artifacts for the
 *                                           prerender check (only if all checks pass)
 *   npm run db:verify:auth -- --cleanup     remove leftovers; run no checks
 *
 * ⚠ THIS MUTATES THE LIVE DATABASE. It creates one project, uploads a few small
 * files, and inserts a resume version. Everything it creates is named
 * `zz-verify-*`, and it is all removed again before the process exits unless
 * you explicitly pass --keep.
 *
 * WHY CLEANUP IS IN A `finally`
 *
 * An earlier version left artifacts behind on any failure path and told the
 * operator to run --cleanup themselves. That is the wrong default: a crash
 * partway through would leave a project titled "Verification test project"
 * PUBLISHED in a live database until somebody noticed. The verification body
 * now runs inside try/finally, so cleanup happens on every exit path —
 * a failed check, an unexpected exception, a network error, or success.
 *
 * CLEANUP IS SCOPED, NOT TRACKED
 *
 * It deletes by the `zz-verify-` prefix and the fixed test slug rather than by
 * a list of things this run happened to create. That way a previous crashed run
 * is also swept up, and there is no code path where a created object is missing
 * from a tracking array and therefore survives.
 *
 * CREDENTIALS
 *
 * ADMIN_EMAIL and ADMIN_PASSWORD come from `.env.local` (gitignored) via
 * process.env only. They are never printed, never passed as arguments, and
 * never sent anywhere but Supabase Auth. No service-role key is used anywhere:
 * this authenticates as a real user over the publishable key, exactly as the
 * app does.
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
      /* Node < 20.12 */
    }
  }
}

const URL_ = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

/*
 * Normalised exactly as src/services/auth.service.ts does before calling
 * signInWithPassword. A verification script that authenticates differently
 * from the application is not verifying the application's login path — it is
 * testing a slightly different one, and could pass or fail for reasons the
 * real sign-in never encounters.
 */
const NORMALISED_EMAIL = EMAIL?.trim().toLowerCase()

const KEEP = process.argv.includes('--keep')
const CLEANUP_ONLY = process.argv.includes('--cleanup')

/** Everything this script creates carries this prefix. Cleanup keys off it. */
const PREFIX = 'zz-verify-'
const TEST_SLUG = `${PREFIX}test-project`
const BUCKETS = ['projects', 'profile', 'resume']

if (!URL_ || !KEY) {
  console.error('\nVITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set.\n')
  process.exit(1)
}

if (!EMAIL || !PASSWORD) {
  console.error(`
Cannot run: ADMIN_EMAIL and ADMIN_PASSWORD are not set.

Add them to .env.local (gitignored, stays on your machine):

  ADMIN_EMAIL=you@example.com
  ADMIN_PASSWORD=your-owner-account-password

They are only used to sign in, are never printed by this script, and never
leave your machine.
`)
  process.exit(1)
}

/* --- harness -------------------------------------------------------------- */

let passed = 0
const failures = []

const check = (name, ok, detail = '') => {
  if (ok) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}
const section = (t) => console.log(`\n${t}`)

/*
 * `autoRefreshToken: false` because this script is short-lived and has no token
 * worth refreshing — it avoids a pointless background timer.
 *
 * It is NOT what fixes the exit crash. See the note above `main()`: the open
 * handle is undici's keep-alive TLSSocket, and the fix is to stop calling
 * process.exit() at all.
 */
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } }

/** Signed-in client. */
const admin = createClient(URL_, KEY, CLIENT_OPTIONS)
/** Never signed in — used to prove what the public can and cannot see. */
const anon = createClient(URL_, KEY, CLIENT_OPTIONS)

/**
 * Cleanup needs an admin session, but the verification deliberately signs out
 * near the end to test FR-AUTH-06. This restores one if it is missing, so the
 * sign-out test cannot leave cleanup unable to run.
 */
async function ensureAdminSession() {
  const { data } = await admin.auth.getSession()
  if (data.session) return true
  const { error } = await admin.auth.signInWithPassword({
    email: NORMALISED_EMAIL,
    password: PASSWORD,
  })
  return !error
}

/**
 * Remove every `zz-verify-*` artifact. Idempotent, scoped, and safe to call
 * when nothing exists.
 *
 * Scoped by prefix rather than by a list of what this run created: a tracking
 * array can be missing an entry if the process died between the write and the
 * push, and the object would then survive. A prefix sweep cannot miss one, and
 * it also collects leftovers from an earlier crashed run.
 *
 * Deliberately touches nothing else. No unfiltered delete exists in this file.
 */
async function cleanup() {
  const problems = []

  if (!(await ensureAdminSession())) {
    console.log('  ✗ could not re-authenticate — CLEANUP DID NOT RUN')
    return [`could not sign in to clean up; remove ${TEST_SLUG} and ${PREFIX}* manually`]
  }

  // MED-07 ordering: storage objects before the rows that reference them.
  for (const bucket of BUCKETS) {
    try {
      const { data: files, error: listError } = await admin.storage
        .from(bucket)
        .list('', { limit: 1000 })
      if (listError) {
        problems.push(`${bucket}: could not list (${listError.message})`)
        continue
      }
      const ours = (files ?? []).filter((f) => f.name.startsWith(PREFIX)).map((f) => f.name)
      if (ours.length === 0) {
        console.log(`  · ${bucket}: nothing to remove`)
        continue
      }
      const { error } = await admin.storage.from(bucket).remove(ours)
      if (error) problems.push(`${bucket}: ${error.message}`)
      console.log(`  ${error ? '✗' : '✓'} ${bucket}: removed ${ours.length} object(s)`)
    } catch (error) {
      problems.push(`${bucket}: ${String(error?.message ?? error)}`)
    }
  }

  try {
    const { error } = await admin
      .from('resume_versions')
      .delete()
      .like('storage_path', `${PREFIX}%`)
    if (error) problems.push(`resume_versions: ${error.message}`)
    console.log(`  ${error ? '✗' : '✓'} resume_versions rows matching ${PREFIX}*`)
  } catch (error) {
    problems.push(`resume_versions: ${String(error?.message ?? error)}`)
  }

  try {
    // Children cascade (project_images, pipeline steps, technology links).
    const { error } = await admin.from('projects').delete().eq('slug', TEST_SLUG)
    if (error) problems.push(`projects: ${error.message}`)
    console.log(`  ${error ? '✗' : '✓'} project "${TEST_SLUG}"`)
  } catch (error) {
    problems.push(`projects: ${String(error?.message ?? error)}`)
  }

  return problems
}

/** Confirm, from the public's point of view, that nothing survived. */
async function verifyCleanupWorked() {
  const { data: project } = await anon.from('projects').select('slug').eq('slug', TEST_SLUG)
  const { data: resume } = await anon.from('resume_versions').select('storage_path')
  const leftover = []
  if ((project?.length ?? 0) > 0) leftover.push(`project ${TEST_SLUG} still visible`)
  const strays = (resume ?? []).filter((r) => r.storage_path?.startsWith(PREFIX))
  if (strays.length > 0) leftover.push(`${strays.length} resume_versions row(s) still present`)
  return leftover
}

/* --- the verification body ------------------------------------------------- */

async function runVerification() {
  section('FR-AUTH — real Supabase Auth')

  check('FR-AUTH-02: valid credentials sign in', true)

  {
    const { data, error } = await admin.rpc('is_admin')
    check('TD-04: is_admin() returns true for this user', data === true && !error, error?.message)
  }

  {
    const { data: session } = await admin.auth.getSession()
    const { data, error } = await admin.from('admin_users').select('user_id, role')
    check(
      'admin_users: the signed-in admin reads exactly their own row',
      !error && data?.length === 1 && data[0]?.user_id === session.session?.user.id,
      error?.message ?? `${data?.length ?? 0} rows`,
    )
  }

  /* --- editor save path --------------------------------------------------- */

  section('Editor save path (the same calls ProjectEditorPage makes)')

  // Sweep any leftover from a previous run before inserting.
  await admin.from('projects').delete().eq('slug', TEST_SLUG)

  const { data: inserted, error: insertError } = await admin
    .from('projects')
    .insert({
      slug: TEST_SLUG,
      title: 'Verification test project',
      summary: 'Temporary. Created by scripts/verify-authenticated.mjs; removed automatically.',
      category: 'other',
      status: 'completed',
      publication_state: 'draft',
      visibility_mode: 'case_study_only',
      description_md: 'A temporary project used to verify the editor save path end to end.',
    })
    .select('id')
    .single()

  check(
    'project INSERT succeeds as admin',
    !insertError && Boolean(inserted?.id),
    insertError?.message,
  )

  const projectId = inserted?.id
  if (!projectId) {
    // Throwing rather than exiting: the finally block still runs and cleans up.
    throw new Error('project insert returned no id; cannot continue')
  }

  {
    const { data: techs } = await admin.from('technologies').select('id').limit(2)
    const ids = (techs ?? []).map((t) => t.id)
    await admin.from('project_technologies').delete().eq('project_id', projectId)
    const { error } = await admin
      .from('project_technologies')
      .insert(
        ids.map((technology_id, i) => ({ project_id: projectId, technology_id, sort_order: i })),
      )
    check(`attach ${ids.length} technologies`, !error, error?.message)
  }

  {
    const { error } = await admin.from('project_pipeline_steps').insert([
      { project_id: projectId, step_number: 1, label: 'First step', tech_note: 'Verification' },
      { project_id: projectId, step_number: 2, label: 'Second step' },
    ])
    check('insert pipeline steps', !error, error?.message)
  }

  {
    const { data } = await anon.from('projects').select('slug').eq('slug', TEST_SLUG)
    check('AC-PROJ-5: the draft is invisible to anon by direct slug', (data?.length ?? 0) === 0)
  }

  {
    const { data } = await admin
      .from('projects')
      .select('published_at')
      .eq('id', projectId)
      .single()
    check('published_at is null while draft', data?.published_at === null)
  }

  {
    const { error } = await admin
      .from('projects')
      .update({ publication_state: 'published' })
      .eq('id', projectId)
    check('AC-PROJ-6: publishing the draft succeeds', !error, error?.message)
  }

  {
    const { data } = await admin
      .from('projects')
      .select('published_at')
      .eq('id', projectId)
      .single()
    check('set_published_at trigger fired on first publish', data?.published_at !== null)
  }

  {
    const { data, error } = await anon.from('projects').select('slug, title').eq('slug', TEST_SLUG)
    check(
      'AC-PROJ-6: the published project is now visible to anon',
      !error && data?.length === 1,
      error?.message ?? `${data?.length ?? 0} rows`,
    )
  }

  {
    const { data } = await anon
      .from('v_public_projects')
      .select('slug, technologies')
      .eq('slug', TEST_SLUG)
    const technologies = data?.[0]?.technologies
    check(
      'v_public_projects returns it with technologies aggregated',
      data?.length === 1 && Array.isArray(technologies) && technologies.length === 2,
      `technologies: ${JSON.stringify(technologies)}`,
    )
  }

  {
    const { data } = await anon
      .from('project_pipeline_steps')
      .select('step_number')
      .eq('project_id', projectId)
    check('pipeline steps of a published project are visible to anon', (data?.length ?? 0) === 2)
  }

  /* --- storage ------------------------------------------------------------ */

  section('AC-STORE — Supabase Storage as an authenticated admin')

  const WEBP = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')
  const coverPath = `${PREFIX}cover.webp`

  {
    const { error } = await admin.storage
      .from('projects')
      .upload(coverPath, WEBP, { contentType: 'image/webp', upsert: true })
    check('AC-STORE: admin upload to "projects" succeeds', !error, error?.message)
  }

  {
    const { error } = await admin.storage
      .from('projects')
      .upload(`${PREFIX}bad.txt`, Buffer.from('nope'), { contentType: 'text/plain' })
    check(
      'AC-STORE-2: a disallowed MIME type is rejected even for an admin',
      Boolean(error) && /mime type/i.test(error.message),
      error ? error.message : 'text/plain was ACCEPTED',
    )
  }

  {
    // projects is capped at 8 MB (MED-02). 9 MB must be refused server-side.
    const oversized = Buffer.alloc(9 * 1024 * 1024, 0)
    const { error } = await admin.storage
      .from('projects')
      .upload(`${PREFIX}oversized.webp`, oversized, { contentType: 'image/webp' })
    check(
      'AC-STORE-2: a 9 MB file is rejected by the 8 MB bucket limit',
      Boolean(error),
      'the oversized upload was ACCEPTED',
    )
    if (error) console.log(`      (${error.message})`)
  }

  {
    const response = await fetch(`${URL_}/storage/v1/object/public/projects/${coverPath}`)
    check(
      'AC-STORE-4: public bucket objects load without authentication',
      response.status === 200,
      `HTTP ${response.status}`,
    )
  }

  {
    // MED-07 — deleting a storage object works and the object stops resolving.
    const throwaway = `${PREFIX}deleteme.webp`
    await admin.storage.from('projects').upload(throwaway, WEBP, { contentType: 'image/webp' })
    const { error } = await admin.storage.from('projects').remove([throwaway])
    const after = await fetch(`${URL_}/storage/v1/object/public/projects/${throwaway}`)
    check(
      'MED-07: an admin can delete a storage object and it stops resolving',
      !error && after.status !== 200,
      error?.message ?? `HTTP ${after.status} after delete`,
    )
  }

  /* --- resume ------------------------------------------------------------- */

  section('FR-RES — private resume bucket and signed URLs')

  const MINIMAL_PDF = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
    'utf8',
  )
  const resumePath = `${PREFIX}resume.pdf`

  {
    const { error } = await admin.storage
      .from('resume')
      .upload(resumePath, MINIMAL_PDF, { contentType: 'application/pdf', upsert: true })
    check('FR-RES-01: admin can upload a PDF to the private bucket', !error, error?.message)
  }

  {
    const { error } = await admin.storage
      .from('resume')
      .upload(`${PREFIX}notapdf.webp`, WEBP, { contentType: 'image/webp' })
    check(
      'FR-RES-01: a non-PDF is rejected by the resume bucket',
      Boolean(error) && /mime type/i.test(error.message),
      error ? error.message : 'image/webp was ACCEPTED',
    )
  }

  {
    const response = await fetch(`${URL_}/storage/v1/object/public/resume/${resumePath}`)
    check(
      'TD-08: the resume is NOT reachable through the public endpoint',
      response.status !== 200,
      `HTTP ${response.status}`,
    )
  }

  {
    const { error } = await admin.from('resume_versions').insert({
      storage_path: resumePath,
      file_name: 'verification.pdf',
      mime_type: 'application/pdf',
      is_published: true,
    })
    check('resume_versions row inserts and publishes', !error, error?.message)
  }

  {
    const { error } = await admin.from('resume_versions').insert({
      storage_path: `${PREFIX}second.pdf`,
      file_name: 'second.pdf',
      mime_type: 'application/pdf',
      is_published: true,
    })
    check(
      'FR-RES-02: a SECOND published resume is refused by the partial unique index',
      Boolean(error),
      'two published resumes were allowed',
    )
  }

  {
    const { data, error } = await anon.from('resume_versions').select('storage_path, is_published')
    check(
      'FR-RES-03: anon sees only the published resume row',
      !error && data?.length === 1 && data[0]?.is_published === true,
      error?.message ?? `${data?.length ?? 0} rows`,
    )
  }

  {
    const { data, error } = await anon.storage.from('resume').createSignedUrl(resumePath, 60)
    check(
      'FR-RES-03: anon can mint a signed URL for the published resume',
      !error && Boolean(data?.signedUrl),
      error?.message,
    )
    if (data?.signedUrl) {
      const response = await fetch(data.signedUrl)
      check(
        'FR-RES-03: the signed URL actually serves the PDF',
        response.status === 200,
        `HTTP ${response.status}`,
      )
    }
  }

  {
    // AC-RES-4 — an unpublished path must not be reachable, signed or not.
    await admin.storage.from('resume').upload(`${PREFIX}unpublished.pdf`, MINIMAL_PDF, {
      contentType: 'application/pdf',
      upsert: true,
    })
    const { data, error } = await anon.storage
      .from('resume')
      .createSignedUrl(`${PREFIX}unpublished.pdf`, 60)
    let reachable = false
    if (!error && data?.signedUrl) {
      reachable = (await fetch(data.signedUrl)).status === 200
    }
    check('AC-RES-4: an unpublished resume version is NOT reachable by anon', !reachable)
  }

  /* --- unauthorized access ------------------------------------------------ */

  section('Unauthorized access is rejected')

  await admin.auth.signOut()

  {
    const { data } = await admin.rpc('is_admin')
    check('FR-AUTH-06: is_admin() is false after sign out', data === false)
  }

  {
    const { error } = await admin
      .from('projects')
      .update({ title: 'should not work' })
      .eq('slug', TEST_SLUG)
    check('writes are refused after sign out', Boolean(error), 'the update SUCCEEDED')
  }

  {
    const { data } = await admin.from('contact_messages').select('id')
    check('contact_messages unreadable after sign out', (data?.length ?? 0) === 0)
  }
  // Cleanup re-authenticates via ensureAdminSession(); signing out here cannot
  // strand the artifacts.
}

/* --- run -------------------------------------------------------------------
 *
 * Everything lives in main() and the process NEVER calls process.exit() after
 * a network request.
 *
 * Why: supabase-js talks over undici, which keeps a TLSSocket alive for
 * connection reuse. Calling process.exit() while that socket is mid-close
 * crashes Node on Windows —
 *
 *   Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), win/async.c
 *
 * — and, worse, replaces the real exit code with 127. That was observed on the
 * first live run: the script reported a sign-in failure correctly and then
 * exited 127 instead of 1, so any caller chaining on it would have read the
 * result wrong. Confirmed by inspection: process._getActiveHandles() showed a
 * single TLSSocket.
 *
 * Setting process.exitCode and letting the loop drain gives the correct code
 * and no crash. The socket closes on its own.
 */

async function main() {
  console.log('\nmoin-portfolio — authenticated verification against the LIVE project\n')

  const { data, error } = await admin.auth.signInWithPassword({
    email: NORMALISED_EMAIL,
    password: PASSWORD,
  })
  if (error || !data.session) {
    // Nothing has been created yet, so there is nothing to clean up.
    console.error(`
  ✗ Sign-in FAILED: ${error?.message ?? 'no session returned'}`)
    console.error('    Supabase returns this same message for a wrong password AND for')
    console.error('    an account that does not exist (AC-AUTH-2 — no enumeration), so')
    console.error('    it cannot distinguish the two. Check that:')
    console.error('      1. the auth user exists (Dashboard → Authentication → Users)')
    console.error('      2. it is confirmed')
    console.error('      3. ADMIN_EMAIL / ADMIN_PASSWORD in .env.local match it')
    console.error('      4. a matching row exists in public.admin_users\n')
    return 1
  }

  if (CLEANUP_ONLY) {
    section('Cleanup only — removing any zz-verify-* leftovers')
    const problems = await cleanup()
    const leftover = await verifyCleanupWorked()
    await admin.auth.signOut().catch(() => {})
    const all = [...problems, ...leftover]
    if (all.length > 0) {
      console.log('\nCleanup reported problems:')
      for (const item of all) console.log(`  • ${item}`)
      return 1
    }
    console.log('  ✓ verified from the public side: nothing left behind')
    console.log('\nCleanup complete.\n')
    return 0
  }

  let unexpected = null
  let cleanupProblems = []
  let kept = false

  try {
    await runVerification()
  } catch (err) {
    // A thrown error is a failure like any other — recorded, not swallowed,
    // and it does not skip the finally block.
    unexpected = err
    failures.push(`unexpected exception: ${String(err?.message ?? err)}`)
    console.log(`
  ✗ unexpected exception: ${String(err?.message ?? err)}`)
  } finally {
    const everythingPassed = failures.length === 0 && !unexpected

    if (KEEP && everythingPassed) {
      // The only path that leaves anything behind: an explicit flag AND a
      // completely green run.
      kept = true
      section('--keep: leaving the test artifacts in place')
      console.log(`  · project "${TEST_SLUG}" (published)`)
      console.log(`  · ${PREFIX}* objects in storage, and one published resume_versions row`)
      console.log(`
  Remove them with:  npm run db:verify:auth -- --cleanup`)
    } else {
      section(
        KEEP
          ? 'Cleanup (--keep ignored: the run did not fully pass)'
          : 'Cleanup — removing all zz-verify-* artifacts',
      )
      cleanupProblems = await cleanup()
      const leftover = await verifyCleanupWorked()
      if (leftover.length === 0) {
        console.log('  ✓ verified from the public side: nothing left behind')
      } else {
        for (const item of leftover) {
          console.log(`  ✗ ${item}`)
          cleanupProblems.push(item)
        }
      }
    }

    await admin.auth.signOut().catch(() => {})
  }

  console.log(`
${'─'.repeat(68)}`)

  if (cleanupProblems.length > 0) {
    console.log('⚠ CLEANUP PROBLEMS — remove these by hand:')
    for (const item of cleanupProblems) console.log(`  • ${item}`)
    console.log('')
  }

  if (failures.length === 0) {
    console.log(`PASS — ${passed} authenticated checks against the live project, 0 failures.`)
    if (kept)
      console.log(`
Next: npm run build   → expect "✓ 1 project route"`)
    return cleanupProblems.length > 0 ? 1 : 0
  }

  console.log(`FAIL — ${passed} passed, ${failures.length} failed:
`)
  for (const item of failures) console.log(`  • ${item}`)
  console.log('')
  return 1
}

process.exitCode = await main()
