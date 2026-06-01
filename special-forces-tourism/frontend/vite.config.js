import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd() + '/..', '')

  return {
    plugins: [svelte()],
    define: {
      __GAODE_KEY__: JSON.stringify(env.GAODE_API_KEY || '62894d3a0f745186ad4c99050a491b2f'),
      __GAODE_JS_KEY__: JSON.stringify(env.GAODE_JS_API_KEY || '9062eb1582a21d0abf3f69c47dd97c42')
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
