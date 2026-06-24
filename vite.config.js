import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://monitoring-sa-ciputra.vercel.app', // 👈 Ganti port 3000 ini sesuai port backend local Anda jika ada
        changeOrigin: true,
        secure: false,
      }
    }
  }
})