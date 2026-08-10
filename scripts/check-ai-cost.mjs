#!/usr/bin/env node
// 실제 연결된 AI 파이프라인(server/ai/aiMarketCycle.js)의 비용·시간 체크.
// 6주기 전체를 다 돌리면 돈이 드니, RunPlan 1회 + CycleScenario 2회(1,2주기)만 실측하고
// 나머지 4주기는 CycleScenario 평균값으로 추정한다.
//
// 사용법: node --env-file=.env.local scripts/check-ai-cost.mjs

import { generateRunPlan } from '../server/ai/runPlanModel.js'
import { generateCycleScenario } from '../server/ai/cycleScenarioModel.js'
import { generateAiMarketCycle } from '../server/ai/aiMarketCycle.js'
import { MODEL_TIERS } from '../server/ai/config.js'

// 모델 문자열은 항상 config.js의 MODEL_TIERS에서 읽는다 — 하드코딩하면 모델을 바꿀
// 때마다 이 스크립트가 조용히 낡은 이름/가격을 참조하게 된다(실제로 한 번 그랬다).
// 가격은 WebFetch로 공식 페이지에서 확인한 값(USD / 1M 토큰)이며, 모델이 바뀌면
// 이 테이블도 같이 갱신해야 한다.
const PRICING = {
  [MODEL_TIERS.narrative.model]: { input: 5.00, output: 25.00, source: 'shared/models.md 캐시(claude-api 스킬)' },
  [MODEL_TIERS.weekly.model]: { input: 2.50, output: 15.00, source: 'developers.openai.com/api/docs/models/compare' },
  [MODEL_TIERS.filler.model]: { input: 1.50, output: 7.50, source: 'ai.google.dev/gemini-api/docs/pricing (standard tier)' },
}

function cost(model, inputTokens, outputTokens) {
  const price = PRICING[model]
  if (!price) return null
  return (inputTokens / 1e6) * price.input + (outputTokens / 1e6) * price.output
}

function fmtUsd(n) {
  return `$${n.toFixed(4)}`
}

async function timed(label, fn) {
  const start = performance.now()
  const result = await fn()
  const ms = performance.now() - start
  console.log(`⏱  ${label}: ${(ms / 1000).toFixed(1)}s`)
  return { result, ms }
}

async function main() {
  console.log('='.repeat(60))
  console.log(`1) RunPlan 1회 (${MODEL_TIERS.narrative.model}) — 런당 딱 1번만 호출됨`)
  console.log('='.repeat(60))
  const { result: runPlanResult, ms: runPlanMs } = await timed('generateRunPlan()', () => generateRunPlan())
  const { runPlan, raw: runPlanRaw } = runPlanResult
  const runPlanCost = cost(MODEL_TIERS.narrative.model, runPlanRaw.usage.input_tokens, runPlanRaw.usage.output_tokens)
  console.log(`   토큰: input=${runPlanRaw.usage.input_tokens} output=${runPlanRaw.usage.output_tokens}`)
  console.log(`   비용: ${fmtUsd(runPlanCost)}`)

  console.log('\n' + '='.repeat(60))
  console.log(`2) CycleScenario 2회 (${MODEL_TIERS.weekly.model}) — 1,2주기 실측, 나머지 4주기는 평균으로 추정`)
  console.log('='.repeat(60))
  let worldState = null
  const cycleCosts = []
  const cycleMsList = []
  for (const cycle of [1, 2]) {
    const { result, ms } = await timed(`generateCycleScenario({cycle:${cycle}})`, () =>
      generateCycleScenario({ cycle, runPlan, worldState })
    )
    const { cycleScenario, raw } = result
    worldState = cycleScenario.nextWorldState
    const u = raw.usage
    const c = cost(MODEL_TIERS.weekly.model, u.prompt_tokens, u.completion_tokens)
    console.log(`   cycle ${cycle} 토큰: prompt=${u.prompt_tokens} completion=${u.completion_tokens} (reasoning=${u.completion_tokens_details?.reasoning_tokens ?? '?'})`)
    console.log(`   cycle ${cycle} 비용: ${fmtUsd(c)}`)
    cycleCosts.push(c)
    cycleMsList.push(ms)
  }
  const avgCycleCost = cycleCosts.reduce((a, b) => a + b, 0) / cycleCosts.length
  const avgCycleMs = cycleMsList.reduce((a, b) => a + b, 0) / cycleMsList.length

  console.log('\n' + '='.repeat(60))
  console.log('3) 실제 연결 경로(generateAiMarketCycle) 왕복 1회 — 컴파일 오버헤드 포함')
  console.log('='.repeat(60))
  await timed('generateAiMarketCycle({cycle:1})', () =>
    generateAiMarketCycle({ cycle: 1 })
  )
  console.log('   (내부에서 RunPlan을 캐싱하므로 이미 위에서 생성한 runPlanPromise를 재사용함)')

  console.log('\n' + '='.repeat(60))
  console.log('요약 — 런 1회(6주기) 전체 기준 추정')
  console.log('='.repeat(60))
  const totalCost = runPlanCost + avgCycleCost * 6
  const totalMs = runPlanMs + avgCycleMs * 6
  console.log(`RunPlan(1회):        ${fmtUsd(runPlanCost)}  /  ${(runPlanMs / 1000).toFixed(1)}s`)
  console.log(`CycleScenario(평균/1회): ${fmtUsd(avgCycleCost)}  /  ${(avgCycleMs / 1000).toFixed(1)}s`)
  console.log(`CycleScenario × 6주기: ${fmtUsd(avgCycleCost * 6)}  /  ${((avgCycleMs * 6) / 1000).toFixed(1)}s (순차 호출 가정)`)
  console.log(`─────────────────────────────────────`)
  console.log(`런 1회(6주기) 총 예상 비용: ${fmtUsd(totalCost)}`)
  console.log(`런 1회(6주기) 총 예상 시간(순차): ${(totalMs / 1000).toFixed(1)}s`)
  console.log(`\n※ generateAiMarketCycle()은 아직 filler(${MODEL_TIERS.filler.model})를 호출하지 않는다`)
  console.log('  (server/ai/aiMarketCycle.js가 fillerModel.js를 import하지 않음) — 비용 계산에서 제외.')
  console.log('※ 실제 로딩 화면 체감 시간 = CycleScenario 1회 호출 시간 (RunPlan은 런 시작 1회, 캐싱됨).')
}

main().catch((err) => {
  console.error('실패:', err)
  process.exitCode = 1
})
