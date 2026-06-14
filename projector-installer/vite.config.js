import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess({ typescript: true }),
      onwarn: (warning, handler) => {
        if (warning.code === 'a11y-click-events-have-key-events') return
        if (warning.code === 'a11y-no-noninteractive-element-interactions') return
        if (warning.code === 'a11y-no-noninteractive-tabindex') return
        handler(warning)
      }
    })
  ],
  server: {
    port: 5173
  }
})
