import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In Docker Compose the backend is reachable by service name (backend:8000),
// not localhost. Override with VITE_PROXY_TARGET; fall back to localhost for
// running `npm run dev` directly on the host.
const target = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: { '/api': target },
  },
})
