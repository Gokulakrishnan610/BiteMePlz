import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'REC Kiosk',
        short_name: 'Kiosk',
        description: 'REC Kiosk Webapp - Campus Food Ordering',
        theme_color: '#6a1b9a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['food', 'shopping', 'education'],
        lang: 'en',
        dir: 'ltr',
        icons: [
          {
            src: '/images/rec college.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/images/rec college.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/images/rec college.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/images/rec college.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/images/rec college.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/images/rec college.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/images/rec college.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/images/rec college.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: '/images/rec college.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'REC Kiosk Desktop View',
          },
          {
            src: '/images/rec college.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'REC Kiosk Mobile View',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/kioskrec\.onrender\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
    // 🔑 ensures _redirects is copied into dist/
    viteStaticCopy({
      targets: [
        {
          src: 'public/_redirects',
          dest: '.',
        },
      ],
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target:
          process.env.NODE_ENV === 'production'
            ? 'https://rec-kiosk.onrender.com'
            : 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target:
          process.env.NODE_ENV === 'production'
            ? 'https://rec-kiosk-media.onrender.com'
            : 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  define: {
    'process.env': {},
  },
  preview: {
    port: 4173,
    strictPort: true,
    allowedHosts: ['https://rec-kiosk.onrender.com'], // ✅ corrected hostname
  },
});
