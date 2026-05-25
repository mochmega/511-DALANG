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
    port: 5173,
    strictPort: true
  },
  optimizeDeps: {
    include: ['recharts', 'lodash'],
    force: true
  },
  build: {
    commonjsOptions: {
      include: [/lodash/, /recharts/, /node_modules/],
      transformMixedEsModules: true
    }
  }
})