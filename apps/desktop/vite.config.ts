import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Tauri expects a fixed port and must not clear its console output.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  clearScreen: false,
  server: {
    // IPv4 explicitly: Node resolves `localhost` to ::1 only on Windows, so
    // http://127.0.0.1:1420 (and some browsers) found nothing.
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    // `npm run dev` opens the gallery in the browser; Tauri mode opens its own windows.
    open: mode !== 'tauri',
    watch: { ignored: ['**/src-tauri/**'] },
  },
  // Pre-bundle up front: lazy discovery re-optimized mid-load and split React in two.
  optimizeDeps: {
    include: ['react', 'react-dom/client', 'react/jsx-runtime', 'zustand', 'lucide-react', 'clsx'],
  },
  build: {
    target: 'es2022',
    // Vite 8 / Rolldown name mangling gave two top-level bindings the same short name
    // (the React CJS module and a react-dom marker string), so zustand got a React
    // without a dispatcher and the release app opened blank windows. Whitespace-only
    // minify until that is fixed upstream; scripts/e2e/smoke-release.mjs guards it.
    minify: false,
    rolldownOptions: {
      output: { minify: { mangle: false, compress: false, codegen: { removeWhitespace: true } } },
    },
  },
  test: { environment: 'node' },
}))
