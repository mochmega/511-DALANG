import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    port: 5174,
    strictPort: true  // Gagal dengan pesan jelas jika port sudah dipakai (tidak diam-diam naik ke port lain)
  }
})