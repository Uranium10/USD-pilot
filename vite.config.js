import { defineConfig, loadEnv } from 'vite'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { createSessionRepository } from './server/sessionRepository.js'
import { generateMarketCycle } from './src/data/generateMarket.js'

function localMarketApi() {
  return {
    name: 'usd-local-market-api',
    configureServer(server) {
      server.middlewares.use('/api/market-cycle', (request, response) => {
        const url = new URL(request.url || '/', 'http://localhost')
        const cycle = Math.min(6, Math.max(1, Number(url.searchParams.get('cycle')) || 1))
        const companyIds = url.searchParams.get('companies')?.split(',').filter(Boolean)
        const coinPriceQuery = url.searchParams.get('coinPrice')
        const coinStartPrice = coinPriceQuery ? Number(coinPriceQuery) : undefined
        const seedQuery = url.searchParams.get('seed')
        const seed = seedQuery ? Number(seedQuery) : undefined
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(JSON.stringify(generateMarketCycle({ cycle, companyIds, coinStartPrice, seed })))
      })
    },
  }
}

function localSessionApi(env) {
  let repository
  const getRepository = () => {
    repository ||= createSessionRepository({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    })
    return repository
  }
  const readBody = (request) => new Promise((resolveBody, reject) => {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => {
      try { resolveBody(body ? JSON.parse(body) : {}) }
      catch (error) { reject(error) }
    })
    request.on('error', reject)
  })
  return {
    name: 'usd-local-session-api',
    configureServer(server) {
      server.middlewares.use('/api/session', async (request, response) => {
        const url = new URL(request.url || '/', 'http://localhost')
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        try {
          let result
          if (request.method === 'GET') result = { session: await getRepository().get(url.searchParams.get('deviceId')) }
          else if (request.method === 'PUT') result = await getRepository().save(await readBody(request))
          else if (request.method === 'DELETE') result = await getRepository().remove(url.searchParams.get('deviceId'))
          else {
            response.statusCode = 405
            result = { error: 'method not allowed' }
          }
          response.end(JSON.stringify(result))
        } catch (error) {
          console.error('local session api error', error)
          response.statusCode = 500
          response.end(JSON.stringify({ error: 'session storage unavailable' }))
        }
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
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), localMarketApi(), localSessionApi(env), bgmManifest()],
  }
})
