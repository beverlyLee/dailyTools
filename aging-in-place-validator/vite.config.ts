import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5188,
    host: '0.0.0.0',
    strictPort: true,
    open: false,
    hmr: {
      port: 5188,
      host: 'localhost',
      protocol: 'ws',
      timeout: 30000,
      overlay: true
    },
    watch: {
      usePolling: true,
      interval: 1000
    }
  }
})
