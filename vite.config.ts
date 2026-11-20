import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// numer wersji (package.json) i data budowania – do napisu w Ustawieniach (src/version.ts)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const pad = (n: number) => String(n).padStart(2, '0')
const now = new Date()
const buildDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        id: '/',
        name: 'Ogarnij życie',
        short_name: 'Ogarnij życie',
        description: 'Zadania, kalendarz i wspólny dom – wszystko w jednym miejscu.',
        lang: 'pl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // ekran startowy Androida: tło ikony (butelkowa zieleń) – płynne przejście do ekranu
        // ładowania, który zaczyna od tego samego widoku (decyzja Hani 2026-10-25)
        background_color: '#1F3D2E',
        theme_color: '#F6F1E7',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        // powiadomienia push (etap 6) – obsługa w public/push-sw.js
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            // Czcionki Fraunces i Nunito – żeby działały też bez internetu.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'czcionki',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    // testy reguł Firestore – osobno, w emulatorze (npm run test:reguly)
    exclude: [...configDefaults.exclude, 'tests/rules/**'],
  },
})
