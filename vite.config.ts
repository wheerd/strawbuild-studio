/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],

          // Canvas chunk for Konva and react-konva
          'vendor-canvas': ['konva', 'react-konva'],

          // State management chunk
          'vendor-store': ['zustand', 'zundo'],

          // Radix UI chunk
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-icons',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toolbar',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-label',
            '@radix-ui/themes'
          ],

          // Geometry utilities chunk (Turf.js and gl-matrix)
          'vendor-geometry': [
            '@turf/helpers',
            '@turf/kinks',
            '@turf/boolean-valid',
            '@turf/line-intersect',
            '@turf/boolean-point-in-polygon',
            '@turf/area',
            'gl-matrix'
          ],

          // Three.js chunk (lazy loaded for 3D viewer)
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei']
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
  }
})
