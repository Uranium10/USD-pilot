import { defineConfig } from 'vite'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { generateMarketCycle } from './src/data/generateMarket.js'

function localMarketApi() {
  return {
    name: 'usd-local-market-api',
    configureServer(server) {
      server.middlewares.use('/api/market-cycle', (request, response) => {
        const url = new URL(request.url || '/', 'http://localhost')
        const cycle = Math.min(6, Math.max(1, Number(url.searchParams.get('cycle')) || 1))
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(JSON.stringify(generateMarketCycle({ cycle })))
      })
    },
  }
}

function bgmManifest() {
  const virtualId = 'virtual:bgm-tracks'
  const resolvedId = `\0${virtualId}`
  return {
    name: 'usd-bgm-manifest',
    resolveId(id) { if (id === virtualId) return resolvedId },
    load(id) {
      if (id !== resolvedId) return
      const directory = resolve(process.cwd(), 'public', 'sounds', 'bgm')
      let files = []
      try {
        files = readdirSync(directory).filter((file) => file.toLowerCase().endsWith('.mp3')).sort()
      } catch {
        // Keep development usable before audio assets are added.
      }
      const url = (file) => `/sounds/bgm/${encodeURIComponent(file)}`
      const tracks = {
        chart: files.filter((file) => /^bgm_chart.*\.mp3$/i.test(file)).map(url),
        night: files.filter((file) => /^bgm_night.*\.mp3$/i.test(file)).map(url),
      }
      return `export default ${JSON.stringify(tracks)}`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localMarketApi(), bgmManifest()],
})
