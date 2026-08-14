-- =========================================================================
-- 20260815090600_create_contact_tables
--
-- contact_messages · social_links
--
-- PRD 23.13, 23.14.
--
-- The CHECK constraints on contact_messages mirror the Zod schema in
-- src/types/forms.ts exactly. That duplication is intentional (SEC-04): the
-- Supabase endpoint is publicly reachable with the publishable key, so client
-- validation is a courtesy and these constraints are the actual rule.
--
-- DOWN: drop table public.social_links, public.contact_messages;
-- =========================================================================

create table public.contact_messages (
  id                uuid primary key default gen_random_uuid(),
  name              text   not null,
  email             citext not null,
  company           text,
  subject           text   not null,
  message           text   not null,
  service_type      public.service_type   not null default 'other',
  status            public.message_status not null default 'new',
  source_page       text,

  -- 23.14: SHA-256 of client IP + a server-side salt, written by trigger.
  -- The raw IP is never stored anywhere in this product.
  ip_hash           text,
  -- Coarse family only ("Chrome"), never the full UA string — a full UA is a
  -- fingerprinting surface for no operational benefit.
  user_agent_family text,

  admin_notes       text,
  created_at        timestamptz not null default now(),
  read_at           timestamptz,
  replied_at        timestamptz,

  constraint contact_messages_name_check    check (length(btrim(name))    between 2 and 80),
  constraint contact_messages_subject_check check (length(btrim(subject)) between 3 and 150),
  constraint contact_messages_message_check check (length(btrim(message)) between 20 and 4000),
  constraint contact_messages_company_check check (company is null or length(company) <= 120),
  constraint contact_messages_email_check
    check (length(email) <= 160 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint contact_messages_source_page_check
    check (source_page is null or length(source_page) <= 200)
);

comment on table public.contact_messages is
  'A triage inbox, not a CRM (NG-02). anon may INSERT and nothing else — there is no SELECT policy at all (25.1).';

-- -------------------------------------------------------------------------
-- social_links (23.13)
--
-- Database-driven rather than hard-coded so Moin can add a profile without a
-- commit (Principle 5: content is data, not code).
-- -------------------------------------------------------------------------
create table public.social_links (
  id             uuid primary key default gen_random_uuid(),
  platform       text not null,
  label          text not null,
  url            text not null,
  icon_key       text not null,
  show_in_hero   boolean not null default true,
  show_in_footer boolean not null default true,
  sort_order     integer not null default 0,
  published      boolean not null default true,

  constraint social_links_url_check
    check (url like 'https://%' or url like 'mailto:%')
);
