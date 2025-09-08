/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/model': resolve(__dirname, './src/model'),
      '@/types': resolve(__dirname, './src/types'),
      '@/assets': resolve(__dirname, './src/assets'),
      '@/test': resolve(__dirname, './src/test')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          react: ['react', 'react-dom', 'react/jsx-runtime'],

          // Canvas chunk for Konva and react-konva
          canvas: ['konva', 'react-konva'],

          // State management chunk
          store: ['zustand', 'zundo'],

          // Radix UI chunk
          radix: [
            '@radix-ui/react-select',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-toolbar',
            '@radix-ui/react-separator',
            '@radix-ui/react-tabs',
            '@radix-ui/react-icons'
          ],

          // Geometry utilities chunk (Turf.js and gl-matrix)
          geometry: [
            '@turf/helpers',
            '@turf/kinks',
            '@turf/boolean-valid',
            '@turf/line-intersect',
            '@turf/boolean-point-in-polygon',
            '@turf/area',
            'gl-matrix'
          ],

          // Model chunk
          model: ['./src/model/store', './src/types/model', './src/types/geometry', './src/types/ids']
        }
      },

      // Tree shaking optimizations
      treeshake: {
        moduleSideEffects: false,
        unknownGlobalSideEffects: false
      }
    },

    // Set chunk size warning limit to 400kb for canvas libraries
    chunkSizeWarningLimit: 400,

    // Enhanced optimizations
    minify: 'esbuild',
    sourcemap: false,

    // Target modern browsers for better minification
    target: 'es2020'
  }
})
