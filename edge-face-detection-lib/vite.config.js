import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'examples',
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist-examples',
    emptyOutDir: true,
  },
});
