import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'REC Kiosk',
        short_name: 'Kiosk',
        description: 'REC Kiosk Webapp',
        theme_color: '#6a1b9a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/images/rec college.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/images/rec college.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
      },
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
            ? 'https://kioskrec.onrender.com'
            : 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target:
          process.env.NODE_ENV === 'production'
            ? 'https://kioskrec.onrender.com'
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
    allowedHosts: ['kioskrec.onrender.com'], // <-- add your Render frontend host here
    port: 4173,
  },
});
