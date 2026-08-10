#!/usr/bin/env node
// AI 모델 3티어 통합 검증 스크립트.
// 실제 게임 흐름에는 아직 연결되어 있지 않다 — 이 스크립트로만 독립 검증한다.
//
// 사용법: node --env-file=.env.local scripts/test-ai-models.mjs
//   (package.json에 `npm run check:ai`로 등록되어 있음)

import { generateRunPlan } from '../server/ai/runPlanModel.js'
import { generateCycleScenario } from '../server/ai/cycleScenarioModel.js'
import { generateFillerText } from '../server/ai/fillerModel.js'
import { MODEL_TIERS } from '../server/ai/config.js'

function section(title) {
  console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`)
}

async function testFiller() {
  section(`[1/3] filler — ${MODEL_TIERS.filler.provider}/${MODEL_TIERS.filler.model}`)
  const text = await generateFillerText({
    instruction: '궤도 채굴 노동조합이 파업을 예고했다는 소문의 출처 플레이버 문구를 하나 만들어줘.',
  })
  console.log('결과:\n' + text)
  return text
}

async function testRunPlan() {
  section(`[2/3] narrative (RunPlan) — ${MODEL_TIERS.narrative.provider}/${MODEL_TIERS.narrative.model}`)
  const { runPlan, raw } = await generateRunPlan()
  console.log(`아크 개수: ${runPlan.arcs?.length}`)
  console.log(`테마: ${runPlan.theme}`)
  console.log(`토큰 사용량: input=${raw.usage?.input_tokens} output=${raw.usage?.output_tokens}`)
  console.log('첫 아크 예시:\n' + JSON.stringify(runPlan.arcs?.[0], null, 2))
  return runPlan
}

async function testCycleScenario(runPlan) {
  section(`[3/3] weekly (CycleScenario) — ${MODEL_TIERS.weekly.provider}/${MODEL_TIERS.weekly.model}`)
  const { cycleScenario, raw } = await generateCycleScenario({ cycle: 1, runPlan, worldState: null })
  console.log(`제목: ${cycleScenario.title}`)
  console.log(`시나리오: ${cycleScenario.title}${cycleScenario.marketMood ? ` / 분위기: ${cycleScenario.marketMood}` : ''}`)
  console.log(`days 개수: ${cycleScenario.days?.length}`)
  console.log(`selfCheck: ${JSON.stringify(cycleScenario.selfCheck)}`)
  console.log(`토큰 사용량: ${JSON.stringify(raw.usage)}`)
  return cycleScenario
}

async function main() {
  const results = { filler: null, narrative: null, weekly: null }
  const errors = {}

  try {
    results.filler = await testFiller()
  } catch (err) {
    errors.filler = err
    console.error('❌ filler 실패:', err.message)
  }

  try {
    results.narrative = await testRunPlan()
  } catch (err) {
    errors.narrative = err
    console.error('❌ narrative(RunPlan) 실패:', err.message)
  }

  try {
    if (results.narrative) {
      results.weekly = await testCycleScenario(results.narrative)
    } else {
      console.log('\n[3/3] weekly — RunPlan이 없어 건너뜀 (더미 runPlan으로 재시도)')
      results.weekly = await testCycleScenario({ theme: '(테스트용 더미)', arcs: [] })
    }
  } catch (err) {
    errors.weekly = err
    console.error('❌ weekly(CycleScenario) 실패:', err.message)
  }

  section('요약')
  for (const tier of ['filler', 'narrative', 'weekly']) {
    console.log(`${tier.padEnd(10)} ${errors[tier] ? '❌ 실패: ' + errors[tier].message : '✅ 성공'}`)
  }

  if (Object.keys(errors).length > 0) {
    process.exitCode = 1
  }
}

main()
