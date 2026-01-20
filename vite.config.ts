/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { nonBlockingStylesPlugin, versionInfoPlugin } from './vite/plugins'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    versionInfoPlugin(),
    nonBlockingStylesPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon-16x16.svg', 'apple-touch-icon.svg'],
      manifest: false,
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 30,
              expiration: { maxEntries: 20 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/assets\/vendor-.*\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'vendor-chunks',
              expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'feature-chunks',
              expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/') && url.pathname.endsWith('.css'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'style-assets',
              expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/assets\/.*\.(?:png|svg|ico|jpg|jpeg|gif|webp|avif|woff2?)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/editor': resolve(__dirname, './src/editor'),
      '@/building': resolve(__dirname, './src/building'),
      '@/construction': resolve(__dirname, './src/construction'),
      '@/shared': resolve(__dirname, './src/shared'),
      '@/assets': resolve(__dirname, './src/assets'),
      '@/test': resolve(__dirname, './src/test')
    }
  },
  build: {
    modulePreload: {
      resolveDependencies: (_url, deps) => deps.filter(dep => !dep.includes('vendor-three'))
    },
    manifest: 'manifest.json',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],

          // State management chunk
          'vendor-store': ['zustand', 'zundo'],

          // Radix UI chunk
          'vendor-radix': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-icons',
            '@radix-ui/react-label',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-toolbar',
            '@radix-ui/react-tooltip'
          ],

          // Geometry utilities chunk (Clipper + vector math)
          'vendor-geometry': ['clipper2-wasm', 'gl-matrix'],

          // Three.js chunk (lazy loaded for 3D viewer)
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],

          'vendor-manifold': ['manifold-3d'],

          // IFC
          'vendor-ifc': ['web-ifc']
        }
      }
    },

    // Set chunk size warning limit to 400kb for canvas libraries
    chunkSizeWarningLimit: 400,

    // Enhanced optimizations
    minify: 'esbuild',
    sourcemap: false,

    // Target modern browsers for better minification
    target: 'es2020'
  },

  assetsInclude: ['clipper2-wasm/dist/**/*.wasm', 'web-ifc/*.wasm', 'manifold-3d/*.wasm']
})
