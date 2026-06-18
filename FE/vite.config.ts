import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://cancha_be:8001',
        changeOrigin: true,
      },
      '/dashboard': {
        target: 'http://cancha_be:8001',
        changeOrigin: true,
      },
    },
  },
})
