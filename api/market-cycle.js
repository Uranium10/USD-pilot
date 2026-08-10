import { generateAiMarketCycle, prefetchAiCycleScenario } from '../server/ai/aiMarketCycle.js'

export default async function handler(request, response) {
  const cycle = Math.min(7, Math.max(1, Number(request.query?.cycle) || 1))
  const companies = Array.isArray(request.query?.companies) ? request.query.companies[0] : request.query?.companies
  const companyIds = companies ? companies.split(',').filter(Boolean) : undefined
  const prefetchQuery = Array.isArray(request.query?.prefetch) ? request.query.prefetch[0] : request.query?.prefetch
  const coinPriceQuery = Array.isArray(request.query?.coinPrice) ? request.query.coinPrice[0] : request.query?.coinPrice
  const coinStartPrice = coinPriceQuery ? Number(coinPriceQuery) : undefined
  // stockPrices=stock-1~stock-5 종가를 슬롯 순서 그대로 콤마로 이은 값(빈 칸 허용).
  // 코인의 coinStartPrice와 동일한 목적 — 사이클 경계에서 가격이 리셋되지 않게 이어준다
  // (src/data/generateMarket.js 참고, 2026-08-10 수정).
  const stockPricesQuery = Array.isArray(request.query?.stockPrices) ? request.query.stockPrices[0] : request.query?.stockPrices
  const companyStartPrices = stockPricesQuery
    ? stockPricesQuery.split(',').map((value) => (value === '' ? undefined : Number(value)))
    : undefined
  const sisyphusPriceQuery = Array.isArray(request.query?.sisyphusPrice) ? request.query.sisyphusPrice[0] : request.query?.sisyphusPrice
  const sisyphusStartPrice = sisyphusPriceQuery ? Number(sisyphusPriceQuery) : undefined
  const seedQuery = Array.isArray(request.query?.seed) ? request.query.seed[0] : request.query?.seed
  const seed = seedQuery ? Number(seedQuery) : undefined
  const deviceIdQuery = Array.isArray(request.query?.deviceId) ? request.query.deviceId[0] : request.query?.deviceId
  const deviceId = deviceIdQuery || undefined
  response.setHeader('Cache-Control', 'no-store')

  // prefetch 모드는 시장을 만들지 않고 AI 시나리오만 미리 생성해 저장한다. 가격 경로는
  // 그 주 마지막 코인 종가가 필요해서 미리 만들 수 없기 때문이다(db/schema.sql 참고).
  if (prefetchQuery === '1' || prefetchQuery === 'true') {
    response.status(200).json(await prefetchAiCycleScenario({ cycle, companyIds, deviceId }))
    return
  }

  response.status(200).json(await generateAiMarketCycle({ cycle, companyIds, coinStartPrice, companyStartPrices, sisyphusStartPrice, seed, deviceId }))
}
