import { generateMarketCycle, injectMarketNoise } from '../data/generateMarket.js'

// 사이클 번호를 키로 하는 진행 중/완료된 fetch 프로미스 캐시.
// prefetchMarketCycle()이 미리 채워두면, 나중에 fetchMarketCycle()이 같은 cycle을
// 다시 요청할 때 새 요청을 쏘지 않고 이미 진행 중이던 프로미스를 그대로 재사용한다 —
// AI 생성(사이클당 수십 초)이 정산 화면을 보는 동안 백그라운드에서 미리 끝나도록 하기 위함.
// 배경: USD-spec/agent_workthrough_2.md (프리페치가 없을 때 로딩 화면 체감 시간 실측).
const inFlightByCycle = new Map()

// 시나리오 프리페치를 이미 요청한 사이클. 같은 사이클에 대해 두 번 쏘지 않기 위한
// 클라이언트 측 중복 방지용(React StrictMode의 이중 마운트 포함).
const prefetchedScenarioCycles = new Set()

export function resetMarketCycleCache() {
  inFlightByCycle.clear()
  prefetchedScenarioCycles.clear()
}

// 2026-08-10: 코인은 원래부터 coinStartPrice로 직전 사이클 종가를 이어받는데, 5개
// 기업/시지프는 이 연속성이 없어 사이클 경계마다 가격이 조용히 리셋됐다(실측: 최대
// ±20%대 괴리, src/data/generateMarket.js 참고). companyStartPrices(stock-1~5 종가
// 배열)/sisyphusStartPrice를 코인과 동일한 패턴으로 추가해 같은 문제를 없앤다.
function buildUrl(cycle, companyIds, coinStartPrice, seed, deviceId, companyStartPrices, sisyphusStartPrice) {
  const params = new URLSearchParams({ cycle: String(cycle) })
  if (companyIds?.length) params.set('companies', companyIds.join(','))
  if (Number.isFinite(coinStartPrice)) params.set('coinPrice', String(coinStartPrice))
  if (Array.isArray(companyStartPrices) && companyStartPrices.some((price) => Number.isFinite(price))) {
    params.set('stockPrices', companyStartPrices.map((price) => (Number.isFinite(price) ? price : '')).join(','))
  }
  if (Number.isFinite(sisyphusStartPrice)) params.set('sisyphusPrice', String(sisyphusStartPrice))
  if (Number.isFinite(seed)) params.set('seed', String(seed))
  if (deviceId) params.set('deviceId', deviceId)
  return `/api/market-cycle?${params}`
}

async function requestMarketCycle(cycle, companyIds, coinStartPrice, seed, deviceId, companyStartPrices, sisyphusStartPrice) {
  try {
    const response = await fetch(buildUrl(cycle, companyIds, coinStartPrice, seed, deviceId, companyStartPrices, sisyphusStartPrice))
    if (!response.ok) throw new Error(`market api: ${response.status}`)
    const market = await response.json()
    return injectMarketNoise(market)
  } catch (error) {
    console.warn('시장 API를 사용할 수 없어 로컬 대체 데이터를 사용합니다.', error)
    return injectMarketNoise(generateMarketCycle({ cycle, companyIds, coinStartPrice, seed, companyStartPrices, sisyphusStartPrice }))
  }
}

// 정산 화면에 들어가는 시점처럼 "곧 다음 사이클이 필요해질 것"을 미리 아는 곳에서
// 호출한다. 반환값은 버리고 fire-and-forget으로 써도 되고, await해서 바로 써도 된다 —
// 어느 쪽이든 fetchMarketCycle()이 같은 cycle을 요청하면 이 프로미스를 재사용한다.
export function prefetchMarketCycle(cycle, companyIds, coinStartPrice, seed, deviceId, companyStartPrices, sisyphusStartPrice) {
  if (inFlightByCycle.has(cycle)) return inFlightByCycle.get(cycle)
  const promise = requestMarketCycle(cycle, companyIds, coinStartPrice, seed, deviceId, companyStartPrices, sisyphusStartPrice)
  inFlightByCycle.set(cycle, promise)
  return promise
}

// 다음 주 AI 시나리오만 서버에 미리 만들어 두게 한다(가격 경로는 그 주 마지막 코인
// 종가가 필요해 미리 못 만든다 — server/ai/aiMarketCycle.js의 prefetchAiCycleScenario 참고).
// 주가 시작될 때 발사하면 7일 × 4분의 여유가 생겨서, 플레이어가 실제로 다음 주차에
// 도달할 때는 GPT 호출 없이 저장된 시나리오를 합치기만 하면 된다.
// 응답을 기다리지 않는 fire-and-forget이며, 실패해도 기존 경로가 그대로 동작한다.
export function prefetchCycleScenario(cycle, companyIds, deviceId) {
  if (prefetchedScenarioCycles.has(cycle)) return
  prefetchedScenarioCycles.add(cycle)
  const params = new URLSearchParams({ cycle: String(cycle), prefetch: '1' })
  if (companyIds?.length) params.set('companies', companyIds.join(','))
  if (deviceId) params.set('deviceId', deviceId)
  fetch(`/api/market-cycle?${params}`).catch((error) => {
    // 다음 기회에 다시 시도할 수 있도록 실패한 사이클은 표시를 지운다.
    prefetchedScenarioCycles.delete(cycle)
    console.warn('다음 주 시나리오 프리페치에 실패했습니다(무시).', error)
  })
}

export async function fetchMarketCycle(cycle, companyIds, coinStartPrice, seed, deviceId, companyStartPrices, sisyphusStartPrice) {
  if (inFlightByCycle.has(cycle)) {
    const cached = inFlightByCycle.get(cycle)
    inFlightByCycle.delete(cycle)
    return cached
  }
  return requestMarketCycle(cycle, companyIds, coinStartPrice, seed, deviceId, companyStartPrices, sisyphusStartPrice)
}
