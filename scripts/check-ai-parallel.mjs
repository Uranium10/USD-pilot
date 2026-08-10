#!/usr/bin/env node
// "스켈레톤(weekly 티어) + 날짜별 병렬 본문(filler 티어)" 실험적 파이프라인을
// 기존 순차 방식(generateCycleScenario, weekly 티어 1콜)과 같은 RunPlan으로 정면 비교한다.
// RunPlan은 이미 채워둔 run_plan_pool에서 뽑아 쓴다(재생성 비용 절약).
// 모델 문자열/가격은 server/ai/config.js MODEL_TIERS에서 읽는다.
//
// 사용법: node --env-file=.env.local scripts/check-ai-parallel.mjs

import { createRunPlanPoolRepository } from '../server/runPlanPoolRepository.js'
import { generateCycleScenario } from '../server/ai/cycleScenarioModel.js'
import { generateCycleScenarioParallel } from '../server/ai/cycleScenarioParallel.js'
import { MODEL_TIERS } from '../server/ai/config.js'

// 가격은 WebFetch로 공식 페이지에서 확인한 값(USD / 1M 토큰). 모델이 바뀌면 갱신할 것.
const PRICING = {
  [MODEL_TIERS.weekly.model]: { input: 2.50, output: 15.00 },
  [MODEL_TIERS.filler.model]: { input: 1.50, output: 7.50 },
}

function cost(model, inputTokens, outputTokens) {
  const p = PRICING[model]
  return (inputTokens / 1e6) * p.input + (outputTokens / 1e6) * p.output
}

function validate(cycleScenario, cycle, label) {
  const problems = []
  if (cycleScenario.cycle !== cycle) problems.push('cycle 불일치')
  if (cycleScenario.selfCheck?.consistentWithRunPlan !== true) problems.push('selfCheck.consistentWithRunPlan !== true')
  if (!Array.isArray(cycleScenario.days) || cycleScenario.days.length !== 7) problems.push('days 개수 != 7')
  if (!Array.isArray(cycleScenario.companyStates) || cycleScenario.companyStates.length !== 5) problems.push('companyStates 개수 != 5')

  // 이벤트/소문 개수, headline이 briefNote 그대로 방치된 게 있는지(=문장화 실패) 확인.
  let totalEvents = 0
  let totalRumors = 0
  let unwrittenEvents = 0
  for (const day of cycleScenario.days || []) {
    for (const event of day.events || []) {
      totalEvents++
      if (!event.headline || !event.detail) unwrittenEvents++
    }
    totalRumors += (day.rumorSeeds || []).length
  }
  if (unwrittenEvents > 0) problems.push(`headline/detail 비어있는 사건 ${unwrittenEvents}개`)

  console.log(`   [검증:${label}] 사건 ${totalEvents}개, 소문 ${totalRumors}개, 문제: ${problems.length ? problems.join(', ') : '없음'}`)
  return problems
}

async function main() {
  const poolRepo = createRunPlanPoolRepository({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  const runPlan = await poolRepo.pickRandom()
  if (!runPlan) throw new Error('run_plan_pool이 비어있습니다. npm run gen:run-plan-pool을 먼저 돌리세요.')
  console.log(`RunPlan: "${runPlan.theme}" (아크 ${runPlan.arcs.length}개)\n`)

  console.log('='.repeat(60))
  console.log(`A) 기존 순차 방식 — generateCycleScenario (${MODEL_TIERS.weekly.model} 1콜)`)
  console.log('='.repeat(60))
  const tA = performance.now()
  const { cycleScenario: scenarioA, raw: rawA } = await generateCycleScenario({ cycle: 1, runPlan, worldState: null })
  const msA = performance.now() - tA
  const costA = cost(MODEL_TIERS.weekly.model, rawA.usage.prompt_tokens, rawA.usage.completion_tokens)
  console.log(`   ${(msA / 1000).toFixed(1)}s, 토큰 prompt=${rawA.usage.prompt_tokens} completion=${rawA.usage.completion_tokens}, 비용 $${costA.toFixed(4)}`)
  validate(scenarioA, 1, 'A')

  console.log('\n' + '='.repeat(60))
  console.log(`B) 실험적 병렬 방식 — 스켈레톤(${MODEL_TIERS.weekly.model}) + 날짜별 병렬 7콜(${MODEL_TIERS.filler.model})`)
  console.log('='.repeat(60))
  const tB = performance.now()
  const { cycleScenario: scenarioB, raw: rawB } = await generateCycleScenarioParallel({ cycle: 1, runPlan, worldState: null })
  const msB = performance.now() - tB
  const skeletonUsage = rawB.skeleton.usage
  const skeletonCost = cost(MODEL_TIERS.weekly.model, skeletonUsage.prompt_tokens, skeletonUsage.completion_tokens)
  const detailTokens = rawB.details.reduce(
    (acc, r) => {
      const meta = r.usageMetadata || {}
      // candidatesTokenCount(실제 출력) + thoughtsTokenCount(사고 토큰, 가격 페이지 기준
      // "output" 과금에 포함됨)를 합쳐야 실제 청구액에 가깝다.
      return {
        input: acc.input + (meta.promptTokenCount || 0),
        output: acc.output + (meta.candidatesTokenCount || 0) + (meta.thoughtsTokenCount || 0),
      }
    },
    { input: 0, output: 0 }
  )
  const detailCost = cost(MODEL_TIERS.filler.model, detailTokens.input, detailTokens.output)
  const totalCostB = skeletonCost + detailCost
  console.log(`   ${(msB / 1000).toFixed(1)}s 총합`)
  console.log(`   스켈레톤: prompt=${skeletonUsage.prompt_tokens} completion=${skeletonUsage.completion_tokens}, $${skeletonCost.toFixed(4)}`)
  console.log(`   날짜별 7콜 합계: input=${detailTokens.input} output=${detailTokens.output}, $${detailCost.toFixed(4)}`)
  console.log(`   총 비용: $${totalCostB.toFixed(4)}`)
  validate(scenarioB, 1, 'B')

  console.log('\n' + '='.repeat(60))
  console.log('요약 비교')
  console.log('='.repeat(60))
  console.log(`A) 순차:   ${(msA / 1000).toFixed(1)}s, $${costA.toFixed(4)}`)
  console.log(`B) 병렬:   ${(msB / 1000).toFixed(1)}s, $${totalCostB.toFixed(4)}`)
  const speedup = (1 - msB / msA) * 100
  console.log(`시간 변화: ${speedup >= 0 ? '−' : '+'}${Math.abs(speedup).toFixed(0)}% (양수면 병렬이 더 빠름)`)
  console.log(`비용 변화: ${totalCostB > costA ? '+' : '−'}$${Math.abs(totalCostB - costA).toFixed(4)}`)

  console.log('\n[B 샘플 사건 1개]')
  const sampleDay = scenarioB.days.find((d) => d.events?.length)
  if (sampleDay) console.log(JSON.stringify(sampleDay.events[0], null, 2))
}

main().catch((err) => {
  console.error('실패:', err)
  process.exitCode = 1
})
