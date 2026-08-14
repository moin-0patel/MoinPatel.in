-- =========================================================================
-- 20260815090200_create_core_tables
--
-- profiles (singleton) · site_settings (key/value) · admin_users
--
-- PRD 23.1, 23.15, 23.17.
--
-- DOWN: drop table public.admin_users, public.site_settings, public.profiles;
-- =========================================================================

-- -------------------------------------------------------------------------
-- profiles — site owner identity. Exactly one row, ever (23.1).
-- -------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text        not null,
  role_title         text        not null,
  positioning_line   text        not null,
  tagline            text,
  short_bio          text,
  long_bio_md        text,
  location           text,
  email_public       citext,
  phone_public       text,
  -- FR-CONT 18.3 / Q-10: the number is stored but hidden until Moin decides.
  phone_visible      boolean     not null default false,
  avatar_path        text,
  avatar_alt         text,
  og_image_path      text,
  available_for_work boolean     not null default true,
  published          boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- A11Y-06 / MED-03: an image without alt text cannot be stored at all.
  constraint profiles_avatar_alt_check
    check (avatar_path is null or nullif(btrim(avatar_alt), '') is not null),

  constraint profiles_email_check
    check (email_public is null or email_public ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

comment on table public.profiles is
  'Site owner identity. Singleton — enforced by profiles_singleton below.';

-- The singleton guarantee. A partial unique index on a constant expression
-- permits exactly one row and costs nothing to maintain.
create unique index profiles_singleton on public.profiles ((true));

-- -------------------------------------------------------------------------
-- site_settings — heterogeneous, optional, expected to grow (23.15).
--
-- A key/value table rather than a wide singleton row: these values have
-- nothing in common but their audience, and adding one should not require a
-- schema change. Each key is documented in docs/settings.md and typed in
-- src/types/settings.ts.
-- -------------------------------------------------------------------------
create table public.site_settings (
  key         text primary key,
  value       jsonb       not null,
  description text,
  -- Drives the anon read allow-list in the RLS policy (25.1). Any future
  -- operational or private setting is invisible by default because this
  -- column defaults to false — the safe direction.
  is_public   boolean     not null default false,
  updated_at  timestamptz not null default now(),

  constraint site_settings_key_check check (key ~ '^[a-z][a-z0-9_]{1,60}$')
);

comment on column public.site_settings.is_public is
  'When true, the key is readable by anon. Defaults to false so new settings are private until deliberately exposed (PRD 25.1).';

-- -------------------------------------------------------------------------
-- admin_users — the authorisation source of truth (23.17, TD-04).
--
-- Deliberately NOT user_metadata: that is writable by the user through the
-- auth API and must never carry authorisation. This table is inspectable in
-- SQL and testable with pgTAP.
--
-- Seeded only in local/staging. The production row is created once, manually
-- and documentedly, after the owner account exists (28.1, DEP sequence).
-- -------------------------------------------------------------------------
create table public.admin_users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        citext           not null,
  display_name text,
  role         public.admin_role not null default 'owner',
  created_at   timestamptz      not null default now()
);

comment on table public.admin_users is
  'Membership here IS admin authority (TD-04). No client-side write path exists.';
