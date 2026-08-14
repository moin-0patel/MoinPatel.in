-- =========================================================================
-- 20260815090000_enable_extensions
--
-- PRD 22.2 — no extension is enabled that is not used.
--
--   pgcrypto  gen_random_uuid() for every primary key
--   citext    case-insensitive slugs and emails, so `Moin@X.com` and
--             `moin@x.com` cannot both exist and a slug cannot be shadowed
--             by a differently-cased twin
--
-- DOWN: DROP EXTENSION citext; DROP EXTENSION pgcrypto;
-- =========================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- Private schema for values that must never be reachable through the API.
-- Holds the IP-hash salt used by hash_client_ip() (23.19). PostgREST only
-- exposes schemas listed in its config, and this one never is.
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
