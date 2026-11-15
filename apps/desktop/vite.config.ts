import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Tauri expects a fixed port and must not clear its console output.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  // Pre-bundle up front: lazy discovery re-optimized mid-load and split React in two.
  optimizeDeps: {
    include: ['react', 'react-dom/client', 'react/jsx-runtime', 'zustand', 'lucide-react', 'clsx'],
  },
  build: { target: 'es2022' },
  test: { environment: 'node' },
})
