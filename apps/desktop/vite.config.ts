import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Windows: when the build starts from a lowercase-drive cwd (`c:\...`, as Tauri/VS Code
// sometimes do), Vite resolved node_modules/react under two ids (c: and C:) and bundled
// React twice — zustand then ran with a null dispatcher and the release app opened blank
// windows. Pin the root with an uppercase drive letter and dedupe React.
const upperDrive = (p: string) => p.replace(/^[a-z]:/, (d) => d.toUpperCase())
const ROOT = upperDrive(fileURLToPath(new URL('.', import.meta.url)))

// Tauri expects a fixed port and must not clear its console output.
export default defineConfig(({ mode }) => ({
  root: ROOT,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': upperDrive(fileURLToPath(new URL('./src', import.meta.url))) },
    dedupe: ['react', 'react-dom'],
  },
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
  },
  test: { environment: 'node' },
}))
