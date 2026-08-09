import { generateMarketCycle } from '../data/generateMarket.js'

export async function fetchMarketCycle(cycle, companyIds, coinStartPrice, seed) {
  const params = new URLSearchParams({ cycle: String(cycle) })
  if (companyIds?.length) params.set('companies', companyIds.join(','))
  if (Number.isFinite(coinStartPrice)) params.set('coinPrice', String(coinStartPrice))
  if (Number.isFinite(seed)) params.set('seed', String(seed))
  try {
    const response = await fetch(`/api/market-cycle?${params}`)
    if (!response.ok) throw new Error(`market api: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.warn('시장 API를 사용할 수 없어 로컬 대체 데이터를 사용합니다.', error)
    return generateMarketCycle({ cycle, companyIds, coinStartPrice, seed })
  }
}
