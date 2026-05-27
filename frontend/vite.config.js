import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [
      tailwindcss(),
      react()
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/tests/**/*.test.{js,jsx}']
    },
    server: {
    port: 5173,
    strictPort: true
  },
  optimizeDeps: {
    include: ['recharts'],
    force: true
  },
  build: {
    commonjsOptions: {
      include: [/recharts/, /node_modules/],
      transformMixedEsModules: true
    }
  }
} })