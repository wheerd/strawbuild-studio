/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  // @ts-ignore
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    server: {
      deps: {
        inline: ['konva', 'react-konva']
      }
    }
  },
})
