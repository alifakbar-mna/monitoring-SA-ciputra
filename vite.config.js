import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://monitoring-sa-ciputra.vercel.app',
        changeOrigin: true,
        secure: false,
        // Ditambahkan rewrite agar rute lokal menyatu mulus ke Vercel cloud tanpa duplikasi /api/api
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      }
    }
  }
})