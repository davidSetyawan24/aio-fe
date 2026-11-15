import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker sendiri (src/sw.js): simpen file app + nerima notif di layar HP (Web Push) + tap notif.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      // Manifest juga disajikan pas `npm run dev`, biar bisa langsung Add to Home Screen dari HP/iPad.
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png', 'icons/favicon-32.png'],
      // Font Plus Jakarta Sans ikut disimpen di HP (rancangan usulan e: tetep jalan walau sinyal jelek).
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], maximumFileSizeToCacheInBytes: 3 * 1024 * 1024 },
      manifest: {
        name: 'AIO Space',
        short_name: 'AIO Space',
        description: 'Duit, tagihan, to-do, dan agenda. Semua di satu tempat.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#070807',
        theme_color: '#070807',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // 0.0.0.0 biar bisa dibuka dari HP/iPad lewat IP laptop. Port 5173 udah diizinin di CORS_ORIGINS BE.
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  test: { environment: 'jsdom', globals: true },
})
