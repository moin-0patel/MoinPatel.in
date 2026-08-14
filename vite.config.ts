import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    // PERF-05: keep an eye on the public bundle budget (< 180 KB gzipped).
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        /*
         * FE-07 / PERF-06: the admin tree must never land in a public chunk.
         * Route-level React.lazy does that splitting; these manual chunks keep
         * the shared vendor surface stable and, more importantly, LEGIBLE —
         * PERF-12 asks for a bundle-size review whenever package.json changes,
         * and that review is only meaningful if the chunk names are honest.
         *
         * Matched by module path rather than by package name: a name list maps
         * only the bare specifier, so `react-dom/client` (what main.tsx
         * actually imports) would silently fall through into the entry chunk
         * and a "react-vendor" chunk would ship without React DOM in it.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('@tanstack')) return 'query-vendor'
          if (
            /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
          ) {
            return 'react-vendor'
          }
          return undefined
        },
      },
    },
  },
})
