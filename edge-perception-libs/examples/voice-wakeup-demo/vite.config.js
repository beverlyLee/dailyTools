import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    alias: {
      '@edge-perception/voice-wakeup': path.resolve(__dirname, '../../packages/voice-wakeup/src/js/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@edge-perception/voice-wakeup'],
  },
});
