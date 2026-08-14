-- =========================================================================
-- Supabase environment shim — for local schema verification only.
--
-- THIS FILE IS NOT A MIGRATION. It is never applied to a Supabase project and
-- must never be added to supabase/migrations. It exists so the real migrations
-- can be executed against a bare PostgreSQL instance (PGlite) that does not
-- ship Supabase's platform objects.
--
-- Everything below is something a real Supabase project already provides:
-- the four platform roles, the `extensions` schema, `auth.users` + `auth.uid()`,
-- and the `storage` tables our policies attach to.
--
-- The shim is deliberately minimal. It reproduces the SHAPE our migrations
-- depend on and nothing else — a fuller fake would start hiding differences
-- between this harness and production, which is the one thing it must not do.
-- =========================================================================

-- --- Platform roles ------------------------------------------------------
-- `anon` and `authenticated` are the two the policies name. `service_role` is
-- created so a test can prove it is NOT used anywhere in the frontend path.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

-- --- extensions schema ---------------------------------------------------
-- Supabase pre-creates this and installs extensions into it rather than
-- public. Our first migration relies on it existing.
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

/*
 * Supabase puts `extensions` on the default search_path for its database
 * roles, which is why a column can be declared `citext` rather than
 * `extensions.citext`. Reproduced here so the migrations run unmodified.
 *
 * Note this affects UNQUALIFIED references only. Every SECURITY DEFINER
 * function in our migrations sets `search_path = ''` and fully qualifies its
 * calls (`extensions.digest`, `public.contact_messages`), so none of them
 * depends on this line — which is the point of pinning them.
 */
alter role anon           set search_path to "$user", public, extensions;
alter role authenticated  set search_path to "$user", public, extensions;
alter role service_role   set search_path to "$user", public, extensions;
set search_path to "$user", public, extensions;

-- --- auth ----------------------------------------------------------------
create schema if not exists auth;

-- Only the columns admin_users references. The real table has ~30 more.
create table if not exists auth.users (
  id                uuid primary key default gen_random_uuid(),
  email             text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

/*
 * auth.uid() reads the request's JWT subject claim. Supabase populates that
 * claim from the bearer token; here a test sets it directly with
 * `set local request.jwt.claim.sub = '<uuid>'`, which is exactly how a test
 * impersonates a signed-in user.
 *
 * Returns NULL when unset — which is the anonymous case, and therefore what
 * makes is_admin() return false for anon without any special handling.
 */
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- --- storage -------------------------------------------------------------
create schema if not exists storage;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner      uuid,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

grant usage on schema storage to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
