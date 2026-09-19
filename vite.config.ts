import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// BASE_PATH is "/" for a custom domain (usfeg.org) and "/<repo>/" for a
// project GitHub Pages URL. Set in .github/workflows/deploy.yml.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
})
