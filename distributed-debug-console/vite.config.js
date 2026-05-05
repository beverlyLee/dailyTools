import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
});
