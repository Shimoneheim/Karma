/// <reference types="vitest/config" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Karma/',
  plugins: [
    vue(),
    legacy()
  ],
  build: {
    // jsPDF (with its embedded font) and the spreadsheet parser are big, but
    // they are only loaded on demand, so they do not slow the first page load.
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
