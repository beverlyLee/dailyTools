import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd() + '/..', '')
  return {
    plugins: [svelte()],
    define: {
      'import.meta.env.VITE_GAODE_JS_KEY': JSON.stringify(env.VITE_GAODE_JS_KEY || env.GAODE_JS_KEY || ''),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
