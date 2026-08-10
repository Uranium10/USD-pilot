import { generateMarketCycle } from '../../src/data/generateMarket.js'
import { IMPACT_BY_MAGNITUDE, informationCost } from '../../src/logic/informationEconomy.js'
import { generateCycleScenario } from './cycleScenarioModel.js'
import { generateRunPlan } from './runPlanModel.js'
import { createAiStateRepository } from '../aiStateRepository.js'
import { createRunPlanPoolRepository } from '../runPlanPoolRepository.js'
import { createRestartGuardRepository } from '../restartGuardRepository.js'

// 2026-08-09 재작업: 이전 버전은 runPlanPromise/worldState를 모듈 스코프 변수로 캐싱했다.
// 로컬 `vite dev`(Node 프로세스가 계속 살아있음)에선 문제없이 작동하지만, 실제 배포 환경인
// Vercel 서버리스 함수는 (a) 요청마다 새 인스턴스로 콜드 스타트될 수 있어 캐시가 매번
// 날아갈 수 있고, (b) 같은 웜 인스턴스를 여러 플레이어가 동시에 공유하면 서로 다른
// 세션끼리 같은 RunPlan/worldState를 나눠 쓰는 더 심각한 버그가 생긴다. 그래서 device_id별로
// Turso(`ai_market_state` 테이블)에 영구 저장하도록 바꿨다. 자세한 발견 경위와 실측치는
// USD-spec/agent_workthrough_2.md 참고.

const EVENT_CLOSE_RETENTION = 0.65
const rumorSourceByArchetype = {
  insider: '기업 내부 관계자',
  hacker: '익명 해커',
  broker: '암시장 중개인',
  regulator: '규제 당국 관계자',
  worker: '현장 노동자',
}

let repository
function getRepository() {
  repository ||= createAiStateRepository({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  return repository
}

let poolRepository
function getPoolRepository() {
  poolRepository ||= createRunPlanPoolRepository({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  return poolRepository
}

let restartGuardRepository
function getRestartGuardRepository() {
  restartGuardRepository ||= createRestartGuardRepository({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  return restartGuardRepository
}

// 같은 웜 인스턴스에 아주 가까운 시간에 같은 device_id로 요청이 두 번 들어오는 경우(예:
// 이중 클릭, React StrictMode 등)를 대비한 요청 합류(coalescing)용. 콜드 스타트/다른
// 인스턴스 간 캐시 공유는 보장하지 않는다 — 그건 Turso가 담당한다.
const inFlightRunPlan = new Map()

// 2026-08-09: RunPlan은 이제 기본적으로 미리 채워둔 풀(run_plan_pool)에서 무작위로
// 뽑아 온다 — 새 게임을 시작한 플레이어가 RunPlan 생성(수십 초)을 기다리지 않게
// 하기 위함. 풀이 비어 있으면(아직 scripts/generate-run-plan-pool.mjs를 안 돌렸거나
// 관리자가 안 채워놨을 때) 안전하게 그 자리에서 직접 생성하는 예전 경로로 폴백한다.
// 근거: USD-spec/agent_workthrough_3.md.
function getOrCreateRunPlan(deviceId, existingRunPlan) {
  if (existingRunPlan) return Promise.resolve(existingRunPlan)
  if (inFlightRunPlan.has(deviceId)) return inFlightRunPlan.get(deviceId)
  const promise = getPoolRepository().pickRandom()
    .then((pooled) => pooled || generateRunPlan().then(({ runPlan }) => runPlan))
    .finally(() => inFlightRunPlan.delete(deviceId))
  inFlightRunPlan.set(deviceId, promise)
  return promise
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function validScenario(scenario, cycle) {
  return scenario?.cycle === cycle
    && scenario.selfCheck?.consistentWithRunPlan === true
    && Array.isArray(scenario.days)
    && scenario.days.length === 7
}

export function compileScenario(market, scenario) {
  for (const day of market.days) {
    const scenarioDay = scenario.days.find((item) => item.day === day.day)
    if (!scenarioDay) continue
    const generatedNews = []
    const retainedImpactByEventId = new Map()
    const orderedEvents = [...(scenarioDay.events || [])]
      .sort((left, right) => Number(left.impactProgress) - Number(right.impactProgress))
    for (const event of orderedEvents) {
      const stock = day.stocks.find((asset) => asset.id === event.primaryStockId)
      if (!stock || stock.assetType !== 'company') continue
      const progress = clamp(Number(event.impactProgress) || 0.5, 0.04, 0.98)
      let pointIndex = stock.path.findIndex((point) => point.progress >= progress)
      if (pointIndex < 1) pointIndex = Math.min(1, stock.path.length - 1)
      const expectedImpact = IMPACT_BY_MAGNITUDE[event.magnitude] || IMPACT_BY_MAGNITUDE.minor
      const signedImpact = expectedImpact * (event.direction === 'down' ? -1 : 1)
      const previousPrice = stock.path[pointIndex - 1].price
      const closeBeforeImpact = stock.path.at(-1).price
      stock.path[pointIndex].price = Math.round(clamp(previousPrice * (1 + signedImpact), stock.startPrice * 0.5, stock.startPrice * 1.5) * 100) / 100
      for (let laterIndex = pointIndex + 1; laterIndex < stock.path.length; laterIndex += 1) {
        const point = stock.path[laterIndex]
        const elapsedAfterImpact = clamp((point.progress - progress) / Math.max(0.01, 1 - progress), 0, 1)
        const retainedImpact = signedImpact * (1 - (1 - EVENT_CLOSE_RETENTION) * elapsedAfterImpact)
        point.price = Math.round(clamp(point.price * (1 + retainedImpact), stock.startPrice * 0.5, stock.startPrice * 1.5) * 100) / 100
      }
      retainedImpactByEventId.set(event.eventId, Math.abs(stock.path.at(-1).price / closeBeforeImpact - 1))
      const headline = String(event.headline || event.detail || '').trim()
      generatedNews.push({
        id: event.eventId || `ai-c${market.cycle}-d${day.day}-n${generatedNews.length}`,
        progress: clamp(progress - 0.015, 0.01, 0.99),
        impactProgress: progress,
        stockId: stock.id,
        direction: event.direction,
        text: headline.includes(stock.name) ? headline : `${stock.name}, ${headline}`,
      })
    }
    const fixedNews = day.news.filter((item) => item.stockId === 'stock-sisyphus')
    if (generatedNews.length) day.news = [...generatedNews, ...fixedNews].sort((a, b) => a.progress - b.progress)
    const eventsById = new Map((scenarioDay.events || []).map((event) => [event.eventId, event]))
    const generatedRumors = (scenarioDay.rumorSeeds || []).map((seed, index) => {
      const event = eventsById.get(seed.targetEventId)
      if (!event) return null
      const stock = day.stocks.find((asset) => asset.id === event.primaryStockId)
      if (!stock) return null
      const accuracy = { low: 0.58, medium: 0.72, high: 0.86 }[seed.confidence] || 0.65
      const expectedImpact = retainedImpactByEventId.get(event.eventId)
        ?? (IMPACT_BY_MAGNITUDE[event.magnitude] || IMPACT_BY_MAGNITUDE.minor) * EVENT_CLOSE_RETENTION
      return {
        id: `ai-c${market.cycle}-d${day.day}-r${index}`,
        stockId: event.primaryStockId,
        direction: event.direction,
        cost: informationCost({ accuracy, expectedImpact, cycle: market.cycle }),
        accuracy,
        expectedImpact,
        impactMagnitude: event.magnitude || 'minor',
        resolveProgress: clamp(Number(event.impactProgress) || 0.5, 0.04, 0.98),
        resolutionBasis: 'eventMove',
        source: rumorSourceByArchetype[seed.sourceArchetype] || '익명 제보자',
        text: String(seed.angle || '').includes(stock.name) ? seed.angle : `${stock.name}: ${seed.angle}`,
      }
    }).filter(Boolean)
    const fixedRumors = day.rumors.filter((item) => item.stockId === 'stock-sisyphus')
    if (generatedRumors.length) {
      const compiledRumors = generatedRumors.slice(0, 3)
      const fallbackRumors = day.rumors.filter((item) => item.stockId !== 'stock-sisyphus')
      for (const fallbackRumor of fallbackRumors) {
        if (compiledRumors.length >= 3) break
        compiledRumors.push(fallbackRumor)
      }
      // 로컬 생성기가 2~4일 간격으로 배치한 시지프 정보가 있는 날에는 AI 정보에
      // 네 번째로 덧붙이지 않고, 세 슬롯 중 하나를 결정론적으로 교체한다.
      if (fixedRumors.length && compiledRumors.length) {
        const replaceIndex = (market.cycle + day.day) % compiledRumors.length
        compiledRumors[replaceIndex] = fixedRumors[0]
      }
      day.rumors = compiledRumors
    }
  }
  return { ...market, aiGenerated: true, scenarioTitle: scenario.title }
}

export const isAiScenarioCycle = (cycle) => Number.isInteger(Number(cycle)) && Number(cycle) >= 1 && Number(cycle) <= 7

const companiesOf = (market) => market.days[0]?.stocks
  .filter((stock) => /^stock-[1-5]$/.test(stock.id))
  .map(({ id, name, sector }) => ({ id, name, sector }))

function aiPathReady(deviceId) {
  const enabled = process.env.AI_MARKET_ENABLED !== 'false'
  const keysReady = process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY
  const dbReady = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
  // deviceId가 없으면 세션별로 상태를 구분해 저장할 수 없다 — 매번 새 RunPlan을
  // 만드는 건 비용·시간 낭비고, 캐싱을 세션 밖으로 흘리면 다른 플레이어와 섞인다.
  // 그래서 deviceId 또는 DB 설정이 없으면 안전하게 기존 결정론적 생성기로 바로 폴백한다.
  return Boolean(enabled && keysReady && dbReady && deviceId)
}

// 이번 사이클의 AI 시나리오를 확보한다. 프리페치가 이미 만들어 저장해 둔 것이 있으면
// GPT를 호출하지 않고 그대로 쓴다 — 이 캐시 적중이 플레이어 대기를 0으로 만드는 핵심이다.
// 반환값의 fresh는 "이번 호출에서 실제로 GPT를 태웠는가"로, 재시작 보호 카운터처럼
// 신규 생성에만 반응해야 하는 부수효과를 구분하는 데 쓴다.
async function obtainCycleScenario({ deviceId, cycle, companies }) {
  const cached = await getRepository().getCycleScenario(deviceId, cycle)
  if (cached && validScenario(cached, cycle)) {
    return { cycleScenario: cached, fresh: false, runPlan: null, nextWorldState: cached.nextWorldState }
  }

  const state = await getRepository().get(deviceId)
  const runPlan = await getOrCreateRunPlan(deviceId, state?.runPlan)

  // 이 사이클 전용으로 기록해 둔 입력 worldState를 읽는다. 기록이 없으면(이 기능 도입
  // 전에 시작된 세션) 기존 단일 슬롯으로 폴백한다. 1주차는 애초에 입력이 없다.
  // 이 분기 덕분에 N+1을 몇 주 앞서 생성해 놓아도 사이클 N의 재생성이 항상 같은
  // 입력을 읽는다 — 단일 슬롯만 있을 때 생기던 서사 어긋남이 구조적으로 불가능해진다.
  const recordedInput = await getRepository().getCycleWorldState(deviceId, cycle)
  const inputWorldState = recordedInput.recorded
    ? recordedInput.worldState
    : (cycle === 1 ? null : state?.worldState ?? null)

  const { cycleScenario } = await generateCycleScenario({
    cycle,
    runPlan,
    worldState: inputWorldState,
    companies,
  })
  if (!validScenario(cycleScenario, cycle)) throw new Error('AI 주간 시나리오 검증 실패')

  // 다음 호출(다음 사이클, 혹은 콜드 스타트 뒤 재시도)이 같은 RunPlan을 재사용하고
  // 이어지는 worldState를 받을 수 있도록 저장한다.
  const nextWorldState = cycleScenario.nextWorldState
  await getRepository().save(deviceId, { runPlan, worldState: nextWorldState })
  await getRepository().saveCycleWorldState(deviceId, cycle + 1, nextWorldState)
  await getRepository().saveCycleScenario(deviceId, cycle, cycleScenario)
  return { cycleScenario, fresh: true, runPlan, nextWorldState }
}

/**
 * 플레이어가 아직 도달하지 않은 사이클의 AI 시나리오를 미리 만들어 저장한다.
 * 결정론적 시장(가격 경로)은 그 주 마지막 코인 종가가 있어야 만들 수 있으므로 여기서
 * 만들지 않는다 — 오직 GPT 시나리오만 확보해 두고, 실제 도달 시점에 합쳐진다.
 * @param {{ cycle:number, companyIds?:string[], deviceId?:string }} options
 */
export async function prefetchAiCycleScenario(options) {
  const cycle = Number(options.cycle)
  if (!isAiScenarioCycle(cycle)) return { ok: false, reason: 'out-of-range' }
  if (!aiPathReady(options.deviceId)) return { ok: false, reason: 'ai-path-unavailable' }
  try {
    // 기업 매핑만 필요하므로 코인 시작가 없이 만든 임시 시장에서 이름만 뽑는다.
    const companies = companiesOf(generateMarketCycle({ cycle, companyIds: options.companyIds }))
    const { fresh } = await obtainCycleScenario({ deviceId: options.deviceId, cycle, companies })
    return { ok: true, cycle, generated: fresh }
  } catch (error) {
    // 프리페치는 어디까지나 선행 최적화다 — 실패해도 플레이어가 실제로 그 주차에
    // 도달할 때 평소 경로로 다시 시도되므로 조용히 넘어간다.
    console.error('[ai-market] 프리페치 실패(무시).', error)
    return { ok: false, reason: 'error' }
  }
}

/**
 * @param {{ cycle:number, companyIds?:string[], coinStartPrice?:number, companyStartPrices?:number[], sisyphusStartPrice?:number, seed?:number, deviceId?:string }} options
 */
export async function generateAiMarketCycle(options) {
  const fallback = generateMarketCycle(options)
  // 1~7주차만 게임의 정식 범위다. 7주차도 일반 기업의 AI 후일담을 컴파일하되,
  // 시지프 폭락 가격·뉴스는 fallback에 들어 있는 고정 로직을 compileScenario가 보존한다.
  if (!isAiScenarioCycle(options.cycle)) return fallback
  if (!aiPathReady(options.deviceId)) return fallback

  const deviceId = options.deviceId
  try {
    if (Number(options.cycle) === 1) {
      const protectedRestart = await getRestartGuardRepository().reusable(deviceId)
      if (protectedRestart.reuse) {
        await getRepository().save(deviceId, {
          runPlan: protectedRestart.cache.runPlan,
          worldState: protectedRestart.cache.worldState,
        })
        // 캐시된 worldState는 1주차의 출력 = 2주차의 입력이다.
        await getRepository().saveCycleWorldState(deviceId, 2, protectedRestart.cache.worldState)
        return { ...protectedRestart.cache.market, restartProtected: true, restartProtectionReason: protectedRestart.reason }
      }
    }
    const cycle = Number(options.cycle)
    const { cycleScenario, fresh, runPlan, nextWorldState } = await obtainCycleScenario({
      deviceId,
      cycle,
      companies: companiesOf(fallback),
    })

    const compiled = compileScenario(fallback, cycleScenario)
    // 재시작 보호 캐시는 일일 신규 생성 횟수를 세므로, 캐시 적중으로 GPT를 태우지
    // 않은 호출에서는 갱신하지 않는다.
    if (cycle === 1 && fresh) {
      await getRestartGuardRepository().saveFresh(deviceId, { market: compiled, runPlan, worldState: nextWorldState })
    }
    return compiled
  } catch (error) {
    console.error('[ai-market] 기존 시장 생성기로 대체합니다.', error)
    return fallback
  }
}
