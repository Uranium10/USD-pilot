import { defineConfig } from 'vite'
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localMarketApi()],
})
