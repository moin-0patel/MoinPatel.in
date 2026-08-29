import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  /*
   * `vite preview` doubles as the production server when the site is deployed
   * as a Render WEB SERVICE (start command `npm run preview`). Render routes
   * traffic to the port in $PORT and to a hostname vite doesn't know, so:
   * bind all interfaces, accept the Render hostname, and honour $PORT.
   * Locally nothing changes — $PORT is unset and the default 4173 stands,
   * and the verify scripts pass their own explicit ports programmatically.
   *
   * The static-site path (render.yaml / vercel.json) does not use this block.
   */
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: Number(process.env.PORT ?? 4173),
  },

  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('@tanstack')) return 'query-vendor'

          if (
            /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(
              id,
            )
          ) {
            return 'react-vendor'
          }

          return undefined
        },
      },
    },
  },
})