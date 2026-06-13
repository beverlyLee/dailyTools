import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3005,
    open: false
  },
  build: {
    outDir: 'dist'
  }
});
