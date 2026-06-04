import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3999,
    proxy: {
      '/api': {
        target: 'http://localhost:8999',
        changeOrigin: true,
      }
    }
  }
})
