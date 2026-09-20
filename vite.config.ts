import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// Serve public/admin/index.html (Decap CMS) in dev instead of the SPA fallback.
const adminInDev: Plugin = {
  name: 'admin-in-dev',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/admin' || req.url === '/admin/') req.url = '/admin/index.html'
      next()
    })
  },
}

// BASE_PATH is "/" for a custom domain (usfeg.org) and "/<repo>/" for a
// project GitHub Pages URL. Set in .github/workflows/deploy.yml.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), adminInDev],
})
