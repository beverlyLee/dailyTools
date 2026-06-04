import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    define: {
      'import.meta.env.VITE_GAODE_JS_API_KEY': JSON.stringify(env.GAODE_JS_API_KEY || '9062eb1582a21d0abf3f69c47dd97c42'),
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8088',
          changeOrigin: true,
        },
      },
    },
  }
})
