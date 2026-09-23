import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readBackendPort() {
  const candidates = [
    path.resolve(__dirname, '../backend/.env'),
    path.resolve(__dirname, '../backend/.env.local')
  ];

  for (const envPath of candidates) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^PORT=(\d+)\s*$/m);
      if (match?.[1]) {
        return match[1];
      }
    } catch {
      // Ignore missing env files and fall back to the default port.
    }
  }

  return '8081';
}

const backendPort = readBackendPort();
const apiProxyTarget = process.env.VITE_DEV_API_PROXY ?? `http://127.0.0.1:${backendPort}`;

export default defineConfig({
  base: '/',
  root: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    react(),
    VitePWA({
      devOptions: {
        enabled: false
      },
      registerType: 'autoUpdate',
      filename: 'sw.js',
      workbox: {
        cacheId: 'nokta-academy-offline-v1',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json,jpg,jpeg,jfif,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => {
              if (request.method !== 'GET' || !url.pathname.startsWith('/api/')) return false;
              const sensitive = [
                '/api/finance',
                '/api/payments',
                '/api/payroll',
                '/api/salaries',
                '/api/expenses',
                '/api/academy-financial-report',
                '/api/auth/',
                '/api/users',
                '/api/students',
                '/api/teachers',
                '/api/audit',
                '/api/roles',
                '/api/permissions',
                '/api/reports',
                '/api/dashboard',
                '/api/messages',
                '/api/student-messages',
                '/api/notifications'
              ];
              return !sensitive.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`) || url.pathname.startsWith(prefix));
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nokta-api-get-cache',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'nokta-api-sensitive-bypass'
            }
          },
          {
            urlPattern: ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'nokta-static-assets',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'nokta-image-cache',
              expiration: {
                maxEntries: 180,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//]
      },
      includeAssets: ['favicon.svg', 'manifest.webmanifest', 'images/**/*'],
      manifest: {
        name: 'Nokta Academy Management System',
        short_name: 'Nokta Academy',
        description: 'Modern school management system',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0ea5e9',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (!normalizedId.includes('/node_modules/')) {
            return undefined;
          }

          if (normalizedId.includes('/recharts/')) {
            return 'charts';
          }

          if (normalizedId.includes('/framer-motion/')) {
            return 'motion';
          }

          if (normalizedId.includes('/i18next/') || normalizedId.includes('/react-i18next/')) {
            return 'i18n';
          }

          if (normalizedId.includes('/lucide-react/')) {
            return 'icons';
          }

          if (normalizedId.includes('/jspdf/') || normalizedId.includes('/html2canvas/')) {
            return 'pdf-tools';
          }

          if (
            normalizedId.includes('/react/') ||
            normalizedId.includes('/react-dom/') ||
            normalizedId.includes('/scheduler/') ||
            normalizedId.includes('/use-sync-external-store/') ||
            normalizedId.includes('/react-router/') ||
            normalizedId.includes('/react-router-dom/') ||
            normalizedId.includes('/@remix-run/router/') ||
            normalizedId.includes('/@tanstack/')
          ) {
            return 'framework';
          }

          return 'vendor';
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    warmup: {
      clientFiles: ['./src/app/main.tsx', './src/app/App.tsx', './src/routes/AppRoutes.tsx']
    },
    proxy: {
      '/api': apiProxyTarget,
      '/uploads': apiProxyTarget,
      '/health': apiProxyTarget
    }
  },
  preview: {
    port: 4173,
    host: true,
    proxy: {
      '/api': apiProxyTarget,
      '/uploads': apiProxyTarget,
      '/health': apiProxyTarget
    }
  }
});
