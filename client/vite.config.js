import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4100'
const fromHere = (path) => fileURLToPath(new URL(path, import.meta.url))

// GitHub Pages answers unknown paths with 404.html. A copy of index.html there
// lets deep links such as /destinations/manali reach the router.
const spaFallback = () => ({
  name: 'spa-fallback',
  apply: 'build',
  closeBundle() {
    copyFileSync(fromHere('./dist/index.html'), fromHere('./dist/404.html'))
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fromHere('.'), 'VITE_')

  return {
    base: env.VITE_BASE_PATH ?? '/',
    plugins: [react(), mode === 'pages' && spaFallback()],
    resolve: {
      // Pure planning modules shared with the browser API of the Pages build.
      alias: { '@server': fromHere('../server/src') },
    },
    server: {
      port: 5173,
      fs: { allow: ['..'] },
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
