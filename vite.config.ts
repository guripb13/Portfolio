import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 is configured in CSS (see src/index.css @theme) — no tailwind.config.js needed.
// The 3D components are lazy-loaded (React.lazy), so Three.js lands in its own async chunk automatically.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 1400 },
})
