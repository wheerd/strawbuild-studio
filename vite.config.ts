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
})
