import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 1000,
    target: 'es2020'
  }
})
