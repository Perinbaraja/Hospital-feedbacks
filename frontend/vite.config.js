import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { API_BASE_URL } from './src/config'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_BASE_URL,
        changeOrigin: true,
      },
    },
  },
})
