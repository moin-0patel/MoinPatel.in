import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * Vitest config — PRD 41.1.
 *
 * Separate from vite.config.ts because the app config loads the Tailwind and
 * React plugins, neither of which these tests need; loading them would add
 * seconds to every run for nothing.
 *
 * Scope note: 41.1 covers "logic that can silently be wrong" — pure functions
 * with no DOM. Component tests (Testing Library) and integration tests against
 * a local Supabase (41.2) are separate suites and are not wired up here.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      include: ['src/lib/**', 'src/types/forms.ts', 'src/types/settings.ts'],
      reporter: ['text', 'html'],
    },
  },
})
