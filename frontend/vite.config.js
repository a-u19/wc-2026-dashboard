import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  // VITE_API_BASE lets you point at a remote backend in production builds
  // e.g. VITE_API_BASE=http://192.168.1.50:8000 npm run build
  define: {
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || ''),
  },
})
