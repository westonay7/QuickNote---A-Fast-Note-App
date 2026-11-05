import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

function stripCloudflareRedirectsPlugin(): Plugin {
  return {
    name: 'strip-cloudflare-redirects',
    buildStart() {
      const pubRedirects = fileURLToPath(new URL('./public/_redirects', import.meta.url))
      if (fs.existsSync(pubRedirects)) {
        fs.unlinkSync(pubRedirects)
        console.log('Removed public/_redirects to eliminate circular redirect rule')
      }
    },
    closeBundle() {
      const distRedirects = fileURLToPath(new URL('./dist/_redirects', import.meta.url))
      if (fs.existsSync(distRedirects)) {
        fs.unlinkSync(distRedirects)
        console.log('Removed dist/_redirects to prevent Cloudflare error 100324')
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    stripCloudflareRedirectsPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
        'manifest.json',
        'manifest.webmanifest',
      ],
      manifest: {
        id: '/',
        name: 'QuickNote',
        short_name: 'QuickNote',
        description: 'Capture your thoughts. Keep everything organized.',
        theme_color: '#4f46e5',
        background_color: '#0f0f16',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['productivity', 'utilities', 'notes'],
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: 'New Note',
            short_name: 'New Note',
            description: 'Quickly create a new note',
            url: '/app/notes/new',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Search Notes',
            short_name: 'Search',
            description: 'Search your notes, folders, and tags',
            url: '/app/search',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    watch: {
      usePolling: true,
    },
  },
  build: {
    // Keep the initial bundle lean; the app is route-split by the router below.
    chunkSizeWarningLimit: 900,
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('your-project-ref')
        ? process.env.VITE_SUPABASE_URL
        : 'https://xgfthqjrnqmsgcizddpq.supabase.co',
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY.includes('your-anon')
        ? process.env.VITE_SUPABASE_ANON_KEY
        : 'sb_publishable_J33jjhr_dbK69BnN5kx1hA_6hl3UJ64',
    ),
  },
})
