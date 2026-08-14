# Site settings

`public.site_settings` is a key/value table (PRD 23.15). This file documents every registered key;
`src/types/settings.ts` types them and parses the `jsonb` values into a checked object.

A key/value table is used rather than a wide singleton row because these values are heterogeneous,
optional, and expected to grow — adding one should not require a schema change.

## Visibility

`is_public` drives the anon read policy (`using (is_public)`, PRD 25.1). It **defaults to `false`**,
so any setting added later is invisible to anonymous users until someone deliberately exposes it.
That is the safe direction of failure: forgetting the flag hides a value rather than leaking one.

There is deliberately no client-side allow-list mirroring this — duplicating the list would mean two
places to forget, and the database is the one that actually enforces it.

## Registered keys (V1)

| Key | Type | Public | Default | Purpose |
|---|---|---|---|---|
| `site_title` | string | yes | Name + role | Default `<title>` and `og:site_name` |
| `site_description` | string | yes | Positioning line | Default meta description |
| `default_og_image_path` | string \| null | yes | `null` | Path in the `profile` bucket for the site-wide 1200×630 social preview (SEO-04) |
| `availability_label` | string \| null | yes | `null` | Hero availability pill text. **Null hides the pill** (Q-20) |
| `contact_response_note` | string \| null | yes | `null` | Response-time expectation on `/contact`. **Null hides the line** rather than promising a time nobody agreed to (Q-19) |
| `contact_captcha_enabled` | boolean | no | `false` | FR-CONT-09 Turnstile (P2) |
| `analytics_enabled` | boolean | yes | `false` | ANA-04 master switch; disables all collection at runtime |
| `nav_resume_visible` | boolean | yes | `true` | Shows the Resume action in the header — still gated by a published resume existing (FR-RES-06) |
| `maintenance_mode` | boolean | yes | `false` | Public routes show a notice; `/admin` stays reachable (P2) |
| `canonical_base_url` | string \| null | yes | `null` | Canonical origin (SEO-05). Falls back to `VITE_SITE_URL` (Q-11) |

## Adding a key

1. Add it to the seed in `supabase/seed/01_site_settings.sql` with an explicit `is_public`.
2. Add the field, its default and its parser branch to `src/types/settings.ts`.
3. Document it in the table above.

Steps 1 and 2 are both required: a key present in the database but absent from `KEY_MAP` is ignored
by the parser, and a field in the type with no row falls back to its default. Neither fails loudly.
