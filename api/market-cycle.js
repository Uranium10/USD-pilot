import { generateMarketCycle } from '../src/data/generateMarket.js'

export default function handler(request, response) {
  const cycle = Math.min(6, Math.max(1, Number(request.query?.cycle) || 1))
  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json(generateMarketCycle({ cycle }))
}

