import { generateMarketCycle } from '../data/generateMarket.js'

export async function fetchMarketCycle(cycle) {
  try {
    const response = await fetch(`/api/market-cycle?cycle=${cycle}`)
    if (!response.ok) throw new Error(`market api: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.warn('시장 API를 사용할 수 없어 로컬 대체 데이터를 사용합니다.', error)
    return generateMarketCycle({ cycle })
  }
}

