import { defineConfig } from 'vite'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [cesium()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    }
  }
})
