import { readFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

const contracts = fileURLToPath(new URL('../contracts', import.meta.url))
export default defineConfig(({ command, mode, isPreview }) => ({
  // GitHub Pages serves the project at /visceral/; `vite preview` must match the build.
  base: command === 'build' || isPreview ? '/visceral/' : '/',
  plugins: [react(), tailwindcss(), {
    name: 'fixture-data',
    configureServer(server) {
      if (mode !== 'fixture') return
      server.middlewares.use('/fixture-data/', async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0].replace(/^\/+/, '')
        // Only contract JSON routes are served; no arbitrary filesystem access.
        if (!/^(manifest|causes|locations\/[A-Z]{3}|summary\/\d{4})\.json$/.test(path)) { next(); return }
        try {
          const body = await readFile(`${contracts}/fixtures/data/${path}`)
          res.setHeader('Content-Type', 'application/json')
          res.end(body)
        } catch { res.statusCode = 404; res.end('Fixture not found') }
      })
    },
  }],
  define: mode === 'fixture' ? { 'import.meta.env.VITE_DATA_BASE': JSON.stringify('/fixture-data/') } : {},
  resolve: { alias: { '@contracts': contracts } },
  server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false },
}))
