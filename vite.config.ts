/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Content-Security-Policy for the published site (not for `npm run dev`, which needs extra freedoms).
 * The browser then runs only our own scripts (plus the small inline theme script, allowed by its hash)
 * and talks only to our site and our Supabase project. If someone ever manages to slip HTML into a page,
 * scripts or connections to other websites are blocked.
 * GitHub Pages cannot send HTTP headers, so the policy goes into a <meta> tag.
 */
function contentSecurityPolicy(supabaseUrl: string | undefined): Plugin {
  return {
    name: 'telauto-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!supabaseUrl) {
          throw new Error('VITE_SUPABASE_URL is missing: the Content-Security-Policy needs it.')
        }
        const supabase = new URL(supabaseUrl)
        const inlineHashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          (match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`,
        )
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${inlineHashes.join(' ')}`,
          "style-src 'self' 'unsafe-inline'",
          `img-src 'self' data: blob: ${supabase.origin}`,
          "font-src 'self' data:",
          `connect-src 'self' ${supabase.origin} wss://${supabase.host}`,
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
        return {
          html,
          tags: [
            {
              tag: 'meta',
              attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
              injectTo: 'head-prepend',
            },
            {
              tag: 'meta',
              attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' },
              injectTo: 'head-prepend',
            },
          ],
        }
      },
    },
  }
}

// The site is served from https://<user>.github.io/<repo>/ on GitHub Pages,
// so production builds need the repository name as base path.
// VITE_BASE can override it (e.g. "/" for a custom domain later).
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    // The Android app (`npm run build:app`, mode "app") loads its files from the app itself: relative paths.
    base: mode === 'app' ? './' : (process.env.VITE_BASE ?? (command === 'build' ? '/telauto/' : '/')),
    ...(mode === 'app'
      ? {
          define: { 'import.meta.env.VITE_APP_BUILD_VERSION': JSON.stringify(new Date().toISOString()) },
          resolve: {
            // app versions of two modules (src/app): entry pages and the React Query provider
            alias: {
              './EntryPages': fileURLToPath(new URL('./src/app/AppEntryPages.tsx', import.meta.url)),
              './QueryProviderEntry': fileURLToPath(new URL('./src/app/AppQueryProviderEntry.ts', import.meta.url)),
            },
          },
        }
      : {}),
    plugins: [react(), tailwindcss(), contentSecurityPolicy(env.VITE_SUPABASE_URL)],
    // npm test: unit tests for validations and filters (they do not need a browser or Supabase)
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  }
})
