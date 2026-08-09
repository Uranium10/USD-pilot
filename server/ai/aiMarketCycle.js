import { generateMarketCycle } from '../../src/data/generateMarket.js'
import { generateCycleScenario } from './cycleScenarioModel.js'
import { generateRunPlan } from './runPlanModel.js'
import { createAiStateRepository } from '../aiStateRepository.js'
import { createRunPlanPoolRepository } from '../runPlanPoolRepository.js'

// 2026-08-09 재작업: 이전 버전은 runPlanPromise/worldState를 모듈 스코프 변수로 캐싱했다.
// 로컬 `vite dev`(Node 프로세스가 계속 살아있음)에선 문제없이 작동하지만, 실제 배포 환경인
// Vercel 서버리스 함수는 (a) 요청마다 새 인스턴스로 콜드 스타트될 수 있어 캐시가 매번
// 날아갈 수 있고, (b) 같은 웜 인스턴스를 여러 플레이어가 동시에 공유하면 서로 다른
// 세션끼리 같은 RunPlan/worldState를 나눠 쓰는 더 심각한 버그가 생긴다. 그래서 device_id별로
// Turso(`ai_market_state` 테이블)에 영구 저장하도록 바꿨다. 자세한 발견 경위와 실측치는
// USD-spec/agent_workthrough_2.md 참고.

const impactByMagnitude = { minor: 0.08, medium: 0.16, major: 0.28 }

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

function compileScenario(market, scenario) {
  for (const day of market.days) {
    const scenarioDay = scenario.days.find((item) => item.day === day.day)
    if (!scenarioDay) continue
    const generatedNews = []
    for (const event of scenarioDay.events || []) {
      const stock = day.stocks.find((asset) => asset.id === event.primaryStockId)
      if (!stock || stock.assetType !== 'company') continue
      const progress = clamp(Number(event.impactProgress) || 0.5, 0.04, 0.98)
      let pointIndex = stock.path.findIndex((point) => point.progress >= progress)
      if (pointIndex < 1) pointIndex = Math.min(1, stock.path.length - 1)
      const signedImpact = (impactByMagnitude[event.magnitude] || impactByMagnitude.minor) * (event.direction === 'down' ? -1 : 1)
      const previousPrice = stock.path[pointIndex - 1].price
      stock.path[pointIndex].price = Math.round(clamp(previousPrice * (1 + signedImpact), stock.startPrice * 0.5, stock.startPrice * 1.5) * 100) / 100
      generatedNews.push({
        id: event.eventId || `ai-c${market.cycle}-d${day.day}-n${generatedNews.length}`,
        progress: clamp(progress - 0.015, 0.01, 0.99),
        impactProgress: progress,
        stockId: stock.id,
        direction: event.direction,
        text: event.headline || event.detail,
      })
    }
    if (generatedNews.length) day.news = generatedNews.sort((a, b) => a.progress - b.progress)
    const eventsById = new Map((scenarioDay.events || []).map((event) => [event.eventId, event]))
    const generatedRumors = (scenarioDay.rumorSeeds || []).map((seed, index) => {
      const event = eventsById.get(seed.targetEventId)
      if (!event) return null
      const accuracy = { low: 0.58, medium: 0.72, high: 0.86 }[seed.confidence] || 0.65
      return {
        id: `ai-c${market.cycle}-d${day.day}-r${index}`,
        stockId: event.primaryStockId,
        direction: event.direction,
        cost: Math.round((100 + accuracy * 350) * (1 + (market.cycle - 1) * 0.2)),
        accuracy,
        source: seed.sourceArchetype,
        text: seed.angle,
      }
    }).filter(Boolean)
    if (generatedRumors.length) day.rumors = generatedRumors
  }
  return { ...market, aiGenerated: true, scenarioTitle: scenario.title }
}

/**
 * @param {{ cycle:number, companyIds?:string[], coinStartPrice?:number, seed?:number, deviceId?:string }} options
 */
export async function generateAiMarketCycle(options) {
  const fallback = generateMarketCycle(options)
  const enabled = process.env.AI_MARKET_ENABLED !== 'false'
  const keysReady = process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY
  const dbReady = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
  // deviceId가 없으면 세션별로 상태를 구분해 저장할 수 없다 — 매번 새 RunPlan을
  // 만드는 건 비용·시간 낭비고, 캐싱을 세션 밖으로 흘리면 다른 플레이어와 섞인다.
  // 그래서 deviceId 또는 DB 설정이 없으면 안전하게 기존 결정론적 생성기로 바로 폴백한다.
  if (!enabled || !keysReady || !dbReady || !options.deviceId) return fallback

  const deviceId = options.deviceId
  try {
    const state = await getRepository().get(deviceId)
    const runPlan = await getOrCreateRunPlan(deviceId, state?.runPlan)
    const { cycleScenario } = await generateCycleScenario({
      cycle: options.cycle,
      runPlan,
      worldState: state?.worldState ?? null,
    })
    if (!validScenario(cycleScenario, options.cycle)) throw new Error('AI 주간 시나리오 검증 실패')

    // 다음 호출(다음 사이클, 혹은 콜드 스타트 뒤 재시도)이 같은 RunPlan을 재사용하고
    // 이어지는 worldState를 받을 수 있도록 저장한다.
    await getRepository().save(deviceId, { runPlan, worldState: cycleScenario.nextWorldState })

    return compileScenario(fallback, cycleScenario)
  } catch (error) {
    console.error('[ai-market] 기존 시장 생성기로 대체합니다.', error)
    return fallback
  }
}
