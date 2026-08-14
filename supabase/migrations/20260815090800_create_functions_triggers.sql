-- =========================================================================
-- 20260815090800_create_functions_triggers
--
-- PRD 23.19.
--
-- Every function here pins `search_path`. An unpinned search_path on a
-- SECURITY DEFINER function is a privilege-escalation vector: a caller who
-- can create objects in a schema earlier on the path can shadow a referenced
-- table and have it executed as the definer.
--
-- DOWN: drop each trigger, then each function, then private.app_secrets.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Schema addition, documented as a deviation from 23.14
--
-- FR-CONT-08 requires the 3-second minimum time-to-submit to be "measured
-- client-side and re-checked by a database trigger". A trigger cannot re-check
-- something it has no record of, so the client must submit when the form was
-- rendered. This column carries that value; the trigger compares it to now()
-- and then blanks it, so it is never retained as per-visitor telemetry.
--
-- Without this column the timing half of FR-CONT-08 would be client-only —
-- i.e. decorative, exactly what TD-11 rejects for the rate limit.
-- -------------------------------------------------------------------------
alter table public.contact_messages
  add column form_rendered_at timestamptz;

comment on column public.contact_messages.form_rendered_at is
  'Client-supplied form render time, used once by enforce_contact_rate_limit() for the FR-CONT-08 timing check, then nulled. Never retained.';

-- -------------------------------------------------------------------------
-- Private secrets — unreachable through the API (see 20260815090000).
-- -------------------------------------------------------------------------
create table private.app_secrets (
  key   text primary key,
  value text not null
);

-- A per-environment random salt. Because it is generated here rather than
-- committed, the same IP produces different hashes in local, staging and
-- production, and the seed file carries no secret (28.1).
insert into private.app_secrets (key, value)
values ('ip_hash_salt', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- -------------------------------------------------------------------------
-- set_updated_at() — shared by every table carrying the column (22.2)
-- -------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger experience_set_updated_at
  before update on public.experience
  for each row execute function public.set_updated_at();

create trigger education_set_updated_at
  before update on public.education
  for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- set_published_at() — 23.19
--
-- Sets projects.published_at on the FIRST transition to published, and never
-- clears it. Unpublishing and republishing must not rewrite history: the
-- original publication date is what "published_at desc" ordering means.
-- -------------------------------------------------------------------------
create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publication_state = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger projects_set_published_at
  before insert or update of publication_state on public.projects
  for each row execute function public.set_published_at();

-- -------------------------------------------------------------------------
-- is_admin() — the authorisation predicate used by every admin policy (TD-04)
--
-- SECURITY DEFINER specifically to avoid recursive RLS evaluation: the
-- admin_users policies would otherwise need to consult admin_users to decide
-- whether admin_users may be read.
--
-- STABLE so the planner evaluates it once per statement rather than per row.
-- -------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

comment on function public.is_admin() is
  'TD-04: admin identity is membership in admin_users — never a user-writable JWT claim.';

-- -------------------------------------------------------------------------
-- hash_client_ip() — 23.19
--
-- Writes ip_hash = SHA-256(client IP || per-environment salt). The raw IP is
-- never stored. The hash exists only so enforce_contact_rate_limit() can count
-- submissions per origin; it is not a visitor identifier.
--
-- Also forces the columns a client must not control (FR-CONT / 25.1 notes).
-- -------------------------------------------------------------------------
create or replace function public.hash_client_ip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salt    text;
  v_headers json;
  v_ip      text;
begin
  select value into v_salt from private.app_secrets where key = 'ip_hash_salt';

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;

  -- x-forwarded-for may be a chain; the client is the first entry.
  v_ip := coalesce(
    split_part(v_headers ->> 'x-forwarded-for', ',', 1),
    v_headers ->> 'cf-connecting-ip',
    'unknown'
  );

  new.ip_hash := encode(extensions.digest(btrim(v_ip) || coalesce(v_salt, ''), 'sha256'), 'hex');

  -- Server-owned columns. A crafted insert cannot pre-set these.
  new.status      := 'new';
  new.admin_notes := null;
  new.read_at     := null;
  new.replied_at  := null;
  new.created_at  := now();

  -- Coarse family only, derived server-side (23.14).
  new.user_agent_family := case
    when v_headers ->> 'user-agent' ilike '%edg/%'     then 'Edge'
    when v_headers ->> 'user-agent' ilike '%chrome/%'  then 'Chrome'
    when v_headers ->> 'user-agent' ilike '%firefox/%' then 'Firefox'
    when v_headers ->> 'user-agent' ilike '%safari/%'  then 'Safari'
    when v_headers ->> 'user-agent' is null            then null
    else 'Other'
  end;

  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- enforce_contact_rate_limit() — FR-CONT-08 / TD-11
--
-- Enforced in the database, not the client, because the endpoint is publicly
-- reachable with the publishable key. A client-side throttle is decorative.
--
-- SECURITY DEFINER so the counting SELECT sees all rows: anon has no SELECT
-- policy on contact_messages (25.1) and would otherwise count zero.
--
-- The raised SQLSTATEs are mapped to user-facing copy by the service layer
-- (PRD 38, "Rate limit hit").
-- -------------------------------------------------------------------------
create or replace function public.enforce_contact_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hour_count integer;
  v_day_count  integer;
begin
  -- Timing check. A human cannot read, fill and submit this form in 3 seconds;
  -- a bot posting straight to the API can. A missing value is treated as a
  -- failure, so omitting the field is not a way around the check.
  if new.form_rendered_at is null
     or new.created_at - new.form_rendered_at < interval '3 seconds' then
    raise exception 'Submission rejected: too fast'
      using errcode = 'P0001', hint = 'contact_too_fast';
  end if;

  -- A clock-skewed or forged future timestamp must not buy an exemption.
  if new.form_rendered_at > new.created_at + interval '5 minutes' then
    raise exception 'Submission rejected: invalid timing'
      using errcode = 'P0001', hint = 'contact_too_fast';
  end if;

  select count(*) into v_hour_count
  from public.contact_messages m
  where m.ip_hash = new.ip_hash
    and m.created_at > now() - interval '1 hour';

  if v_hour_count >= 5 then
    raise exception 'Submission rejected: hourly rate limit reached'
      using errcode = 'P0001', hint = 'contact_rate_limited';
  end if;

  select count(*) into v_day_count
  from public.contact_messages m
  where m.ip_hash = new.ip_hash
    and m.created_at > now() - interval '1 day';

  if v_day_count >= 20 then
    raise exception 'Submission rejected: daily rate limit reached'
      using errcode = 'P0001', hint = 'contact_rate_limited';
  end if;

  -- Consumed. Not retained as per-visitor telemetry.
  new.form_rendered_at := null;

  return new;
end;
$$;

-- Order matters: hash_client_ip must run first so the rate limiter has an
-- ip_hash to count against, and so created_at is server-set before the
-- timing comparison. Trigger execution order within a timing is alphabetical
-- by name, hence the numeric prefixes.
create trigger contact_messages_10_hash_client_ip
  before insert on public.contact_messages
  for each row execute function public.hash_client_ip();

create trigger contact_messages_20_rate_limit
  before insert on public.contact_messages
  for each row execute function public.enforce_contact_rate_limit();

-- -------------------------------------------------------------------------
-- increment_project_view(slug) — P2, 23.19
--
-- The only permitted mutation path for view_count. anon holds no UPDATE grant
-- on projects, so this RPC is the whole surface, and it only ever touches
-- published, non-private rows.
-- -------------------------------------------------------------------------
create or replace function public.increment_project_view(p_slug citext)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects
  set view_count = view_count + 1
  where slug = p_slug
    and publication_state = 'published'
    and visibility_mode <> 'private';
end;
$$;

revoke all on function public.increment_project_view(citext) from public;
grant execute on function public.increment_project_view(citext) to anon, authenticated;
