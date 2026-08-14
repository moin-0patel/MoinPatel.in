/// <reference types="vite/client" />

/**
 * Only the variables declared here exist. Adding one means adding it to
 * `.env.example` and to the validation in `src/lib/env.ts` (FE-08).
 *
 * Nothing secret may ever carry the `VITE_` prefix — that prefix compiles the
 * value into the client bundle, where it is public (SEC-01).
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_SITE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
