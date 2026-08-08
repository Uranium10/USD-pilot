import { generateMarketCycle } from '../src/data/generateMarket.js'

export default function handler(request, response) {
  const cycle = Math.min(6, Math.max(1, Number(request.query?.cycle) || 1))
  const companies = Array.isArray(request.query?.companies) ? request.query.companies[0] : request.query?.companies
  const companyIds = companies ? companies.split(',').filter(Boolean) : undefined
  const coinPriceQuery = Array.isArray(request.query?.coinPrice) ? request.query.coinPrice[0] : request.query?.coinPrice
  const coinStartPrice = coinPriceQuery ? Number(coinPriceQuery) : undefined
  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json(generateMarketCycle({ cycle, companyIds, coinStartPrice }))
}
