import { generateMarketCycle } from '../../src/data/generateMarket.js'
import { generateCycleScenario } from './cycleScenarioModel.js'
import { generateRunPlan } from './runPlanModel.js'

const impactByMagnitude = { minor: 0.08, medium: 0.16, major: 0.28 }
let runPlanPromise
let worldState

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

export async function generateAiMarketCycle(options) {
  const fallback = generateMarketCycle(options)
  const enabled = process.env.AI_MARKET_ENABLED !== 'false'
  const keysReady = process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY
  if (!enabled || !keysReady) return fallback
  try {
    runPlanPromise ||= generateRunPlan().then(({ runPlan }) => runPlan).catch((error) => {
      runPlanPromise = undefined
      throw error
    })
    const runPlan = await runPlanPromise
    const { cycleScenario } = await generateCycleScenario({ cycle: options.cycle, runPlan, worldState })
    if (!validScenario(cycleScenario, options.cycle)) throw new Error('AI 주간 시나리오 검증 실패')
    worldState = cycleScenario.nextWorldState
    return compileScenario(fallback, cycleScenario)
  } catch (error) {
    console.error('[ai-market] 기존 시장 생성기로 대체합니다.', error)
    return fallback
  }
}
