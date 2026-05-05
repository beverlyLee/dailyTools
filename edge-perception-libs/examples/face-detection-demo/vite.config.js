import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@edge-perception/face-detection': path.resolve(__dirname, '../../packages/face-detection/src/js/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@edge-perception/face-detection'],
  },
});
