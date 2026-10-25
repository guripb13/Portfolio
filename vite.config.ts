import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 is configured in CSS (see src/index.css @theme) — no tailwind.config.js needed.
// main.tsx loads the website with a dynamic import(), so the Loader ships in a tiny entry
// and the rest of the site downloads in parallel behind it.
export default defineConfig({
  base: '/Portfolio/',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1400,
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // GSAP + Lenis live in their own cacheable chunk, separate from the entry and app code
        manualChunks(id) {
          if (id.includes('node_modules/gsap') || id.includes('node_modules/@gsap')) return 'gsap'
          if (id.includes('node_modules/lenis')) return 'lenis'
        },
      },
    },
  },
})
