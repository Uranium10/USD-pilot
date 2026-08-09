import { generateMarketCycle } from '../data/generateMarket.js'

// 사이클 번호를 키로 하는 진행 중/완료된 fetch 프로미스 캐시.
// prefetchMarketCycle()이 미리 채워두면, 나중에 fetchMarketCycle()이 같은 cycle을
// 다시 요청할 때 새 요청을 쏘지 않고 이미 진행 중이던 프로미스를 그대로 재사용한다 —
// AI 생성(사이클당 수십 초)이 정산 화면을 보는 동안 백그라운드에서 미리 끝나도록 하기 위함.
// 배경: USD-spec/agent_workthrough_2.md (프리페치가 없을 때 로딩 화면 체감 시간 실측).
const inFlightByCycle = new Map()

export function resetMarketCycleCache() {
  inFlightByCycle.clear()
}

function buildUrl(cycle, companyIds, coinStartPrice, seed, deviceId) {
  const params = new URLSearchParams({ cycle: String(cycle) })
  if (companyIds?.length) params.set('companies', companyIds.join(','))
  if (Number.isFinite(coinStartPrice)) params.set('coinPrice', String(coinStartPrice))
  if (Number.isFinite(seed)) params.set('seed', String(seed))
  if (deviceId) params.set('deviceId', deviceId)
  return `/api/market-cycle?${params}`
}

async function requestMarketCycle(cycle, companyIds, coinStartPrice, seed, deviceId) {
  try {
    const response = await fetch(buildUrl(cycle, companyIds, coinStartPrice, seed, deviceId))
    if (!response.ok) throw new Error(`market api: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.warn('시장 API를 사용할 수 없어 로컬 대체 데이터를 사용합니다.', error)
    return generateMarketCycle({ cycle, companyIds, coinStartPrice, seed })
  }
}

// 정산 화면에 들어가는 시점처럼 "곧 다음 사이클이 필요해질 것"을 미리 아는 곳에서
// 호출한다. 반환값은 버리고 fire-and-forget으로 써도 되고, await해서 바로 써도 된다 —
// 어느 쪽이든 fetchMarketCycle()이 같은 cycle을 요청하면 이 프로미스를 재사용한다.
export function prefetchMarketCycle(cycle, companyIds, coinStartPrice, seed, deviceId) {
  if (inFlightByCycle.has(cycle)) return inFlightByCycle.get(cycle)
  const promise = requestMarketCycle(cycle, companyIds, coinStartPrice, seed, deviceId)
  inFlightByCycle.set(cycle, promise)
  return promise
}

export async function fetchMarketCycle(cycle, companyIds, coinStartPrice, seed, deviceId) {
  if (inFlightByCycle.has(cycle)) {
    const cached = inFlightByCycle.get(cycle)
    inFlightByCycle.delete(cycle)
    return cached
  }
  return requestMarketCycle(cycle, companyIds, coinStartPrice, seed, deviceId)
}
