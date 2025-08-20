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
      '@/test': resolve(__dirname, './src/test'),
    },
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
          store: ['zustand'],
          
          // Floor plan editor chunk (will be code-split automatically)
          // editor: [
          //   './src/components/FloorPlanEditor/FloorPlanEditor',
          //   './src/components/FloorPlanEditor/Canvas/FloorPlanStage',
          //   './src/components/FloorPlanEditor/hooks/useEditorStore'
          // ],
          
          // Model chunk
          model: [
            './src/model/store',
            './src/model/operations',
            './src/types/model',
            './src/types/geometry',
            './src/types/ids'
          ]
        },
      },
    },
    // Set chunk size warning limit to 400kb for canvas libraries
    chunkSizeWarningLimit: 400,
    
    // Additional optimizations
    minify: 'esbuild',
    sourcemap: false,
  },
})
