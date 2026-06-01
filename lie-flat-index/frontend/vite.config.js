import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '../.env')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const env = {}
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        env[key.trim()] = value.trim()
      }
    })
    return env
  } catch {
    return { API_PORT: '8000' }
  }
}

const env = loadEnv()
const API_PORT = env.API_PORT || '8000'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
      }
    }
  }
})
