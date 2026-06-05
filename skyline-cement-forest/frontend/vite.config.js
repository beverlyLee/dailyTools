import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true
        }
      }
    },
    define: {
      'import.meta.env.VITE_GAODE_KEY': JSON.stringify(env.GAODE_JS_API_KEY || '')
    },
    optimizeDeps: {
      include: [
        'maplibre-gl',
        '@deck.gl/mapbox',
        '@deck.gl/layers',
        '@deck.gl/core'
      ]
    },
    build: {
      rollupOptions: {
        external: []
      }
    }
  };
});
