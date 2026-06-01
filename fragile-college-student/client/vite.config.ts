import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.VITE_BACKEND_PORT || env.BACKEND_PORT || '5001'
  const backendHost = env.VITE_BACKEND_HOST || env.BACKEND_HOST || 'localhost'
  const backendProtocol = env.VITE_BACKEND_PROTOCOL || 'http'

  const proxyTarget = `${backendProtocol}://${backendHost}:${backendPort}`

  console.log(`🔌  Backend proxy target: ${proxyTarget}`)
  console.log(`💡  You can set VITE_BACKEND_PORT env var to change this`)

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_FRONTEND_PORT || '3000'),
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: backendProtocol === 'https',
        },
      },
    },
  }
})
