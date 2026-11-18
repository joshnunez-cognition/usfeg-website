import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// SITE=feg (default) proxies to :3001. SITE=leg proxies to :3002.
const leg = process.env.SITE === 'leg'
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: leg ? 5175 : 5174,
    proxy: {
      '/api': `http://127.0.0.1:${leg ? 3002 : 3001}`,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
