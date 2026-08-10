#!/usr/bin/env node
// 실제 라이브 경로(generateCycleScenario — 검증 + 최대 3회 재시도 포함)를 그대로 태워
// 후보 모델을 1→7주차 순차로 측정한다. benchmark-weekly-runs.mjs는 OpenAI를 직접
// 호출해서 재시도 래퍼를 타지 않으므로, 재시도가 실제로 결함을 걸러내는지 보려면 이 쪽을 쓴다.
//
// 사용법:
//   node --env-file=.env.local scripts/verify-weekly-live-path.mjs \
//     --model gpt-5.6-luna --effort low --run-plan-ids 81,90

import { createClient } from '@libsql/client'
import { generateMarketCycle } from '../src/data/generateMarket.js'
import { generateCycleScenario } from '../server/ai/cycleScenarioModel.js'
import { MODEL_TIERS } from '../server/ai/config.js'

const PRICING = {
  'gpt-5.6-terra': { input: 2.5, cached: 0.25, output: 15 },
  'gpt-5.6-luna': { input: 1, cached: 0.1, output: 6 },
}
const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const MODEL = option('model', MODEL_TIERS.weekly.model)
const EFFORT = option('effort', MODEL_TIERS.weekly.effort || 'medium')
const RUN_PLAN_IDS = option('run-plan-ids', '').split(',').map((id) => Number(id.trim())).filter(Number.isInteger)
const STOCK_IDS = new Set(['stock-1', 'stock-2', 'stock-3', 'stock-4', 'stock-5'])
const price = PRICING[MODEL]
if (!price) throw new Error(`가격표에 없는 모델입니다: ${MODEL}`)

const costOf = (usage) => {
  if (!usage) return 0
  const cached = Number(usage.prompt_tokens_details?.cached_tokens || 0)
  const uncached = Math.max(0, Number(usage.prompt_tokens || 0) - cached)
  return (uncached * price.input + cached * price.cached + Number(usage.completion_tokens || 0) * price.output) / 1e6
}

const usageOf = (attempts, key) => attempts.reduce(
  (total, item) => total + Number(item.usage?.[key] || 0),
  0,
)
const nestedUsageOf = (attempts, group, key) => attempts.reduce(
  (total, item) => total + Number(item.usage?.[group]?.[key] || 0),
  0,
)

async function loadRunPlans() {
  const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
  const placeholders = RUN_PLAN_IDS.map(() => '?').join(', ')
  const result = await client.execute({
    sql: `SELECT id, run_plan_json FROM run_plan_pool WHERE id IN (${placeholders})`,
    args: RUN_PLAN_IDS,
  })
  const byId = new Map(result.rows.map((row) => [Number(row.id), JSON.parse(String(row.run_plan_json))]))
  return RUN_PLAN_IDS.filter((id) => byId.has(id)).map((id) => ({ id, runPlan: byId.get(id) }))
}

async function main() {
  const plans = await loadRunPlans()
  if (!plans.length) throw new Error('RunPlan을 불러오지 못했습니다.')

  const market = generateMarketCycle({ cycle: 1, seed: 20260810 })
  const companies = market.days[0].stocks
    .filter((stock) => STOCK_IDS.has(stock.id))
    .map(({ id, name, sector }) => ({ id, name, sector }))

  console.log(`모델 ${MODEL} / effort ${EFFORT} / RunPlan ${plans.map((p) => p.id).join(', ')}`)
  console.log(`기업: ${companies.map((c) => c.name).join(', ')}\n`)

  const rows = []
  for (const { id, runPlan } of plans) {
    console.log(`[Run ${id}] ${runPlan.theme}`)
    let worldState = null
    for (let cycle = 1; cycle <= 7; cycle += 1) {
      const startedAt = performance.now()
      const { cycleScenario, issues, attempts } = await generateCycleScenario({
        cycle, runPlan, worldState, companies, model: MODEL, effort: EFFORT,
      })
      const seconds = (performance.now() - startedAt) / 1000
      const cost = attempts.reduce((total, item) => total + costOf(item.usage), 0)
      // 첫 시도에서 발견된 결함 = 재시도가 없었다면 그대로 게임에 나갔을 결함.
      const firstIssues = attempts[0]?.issues || []
      const events = (cycleScenario.days || []).flatMap((day) => day.events || []).length
      const rumors = (cycleScenario.days || []).flatMap((day) => day.rumorSeeds || []).length

      const promptTokens = usageOf(attempts, 'prompt_tokens')
      const cachedTokens = nestedUsageOf(attempts, 'prompt_tokens_details', 'cached_tokens')
      const completionTokens = usageOf(attempts, 'completion_tokens')
      const reasoningTokens = nestedUsageOf(attempts, 'completion_tokens_details', 'reasoning_tokens')
      const sampleHeadline = cycleScenario.days?.[0]?.events?.[0]?.headline || '(뉴스 없음)'
      const sampleRumor = cycleScenario.days?.[0]?.rumorSeeds?.[0]?.angle || '(정보 없음)'

      rows.push({ id, cycle, seconds, cost, calls: attempts.length, firstIssues, issues, events, rumors, promptTokens, cachedTokens, completionTokens, reasoningTokens })
      console.log(
        `  c${cycle}: ${seconds.toFixed(1)}s $${cost.toFixed(4)} 호출 ${attempts.length}회`
        + ` | 첫 시도 결함 ${firstIssues.length} → 최종 ${issues.length}`
        + ` | 사건 ${events} 정보 ${rumors}`,
      )
      console.log(`     토큰 입력 ${promptTokens.toLocaleString()} (캐시 ${cachedTokens.toLocaleString()}) / 출력 ${completionTokens.toLocaleString()} / reasoning ${reasoningTokens.toLocaleString()}`)
      console.log(`     뉴스 표본: ${sampleHeadline}`)
      console.log(`     정보 표본: ${sampleRumor}`)
      if (firstIssues.length) console.log(`     첫 시도: ${firstIssues.slice(0, 3).join(' / ')}`)
      worldState = cycleScenario.nextWorldState
    }
  }

  const total = (key) => rows.reduce((sum, row) => sum + row[key], 0)
  const firstPassClean = rows.filter((row) => row.firstIssues.length === 0).length
  const finalClean = rows.filter((row) => row.issues.length === 0).length
  const rescued = rows.filter((row) => row.firstIssues.length > 0 && row.issues.length === 0).length
  const orphanFirst = rows.filter((row) => row.firstIssues.some((i) => i.includes('orphan'))).length
  const mismatchFirst = rows.filter((row) => row.firstIssues.some((i) => i.includes('subject mismatch'))).length

  console.log('\n=== 요약 ===')
  console.log(`사이클 ${rows.length}개 | 총 ${total('seconds').toFixed(1)}초 | 총 $${total('cost').toFixed(4)}`)
  console.log(`사이클당 평균 ${(total('seconds') / rows.length).toFixed(1)}초 / $${(total('cost') / rows.length).toFixed(4)}`)
  console.log(`GPT 호출 ${total('calls')}회 (재시도 ${total('calls') - rows.length}회)`)
  console.log(`첫 시도 무결함 ${firstPassClean}/${rows.length} → 최종 무결함 ${finalClean}/${rows.length} (재시도로 구제 ${rescued}건)`)
  console.log(`첫 시도에서 orphan rumor ${orphanFirst}건, 주체 불일치 ${mismatchFirst}건 검출`)
  console.log(`토큰 입력 ${total('promptTokens').toLocaleString()} (캐시 ${total('cachedTokens').toLocaleString()}) / 출력 ${total('completionTokens').toLocaleString()} / reasoning ${total('reasoningTokens').toLocaleString()}`)
  console.log(`사건 ${total('events')}개 / 정보 ${total('rumors')}개`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
