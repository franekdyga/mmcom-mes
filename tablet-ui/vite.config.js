import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Wszystkie zapytania zaczynające się od /api trafią do serwera Node.js
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})