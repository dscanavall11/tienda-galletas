import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El backend escucha en el 4001 (ver backend/.env). API_URL permite apuntar el
// frontend a otro backend sin tocar el código (p. ej. uno con una BD de prueba).
const apiUrl = process.env.API_URL ?? 'http://localhost:4001'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
      },
    },
  },
})
