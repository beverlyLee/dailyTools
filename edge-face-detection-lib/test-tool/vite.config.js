import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, '../core/src/js'),
    },
  },
  build: {
    outDir: '../dist-test-tool',
    emptyOutDir: true,
  },
});
