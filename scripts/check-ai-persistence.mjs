#!/usr/bin/env node
// generateAiMarketCycle()을 같은 deviceId로 두 번 호출해서, 두 번째 호출이 RunPlan을
// 재생성하지 않고 Turso에 저장된 걸 재사용하는지 검증한다 (콜드 스타트 시나리오를
// 흉내내기 위해, 매 호출 전에 모듈을 새로 import해서 in-process 캐시가 없는 상태로 만든다).
//
// 사용법: node --env-file=.env.local scripts/check-ai-persistence.mjs

import { createAiStateRepository } from '../server/aiStateRepository.js'

const TEST_DEVICE_ID = `test-persist-${Date.now()}`

async function freshGenerateAiMarketCycle() {
  // 캐시 버스팅 쿼리로 매번 새 모듈 인스턴스를 import한다 — 서버리스 콜드 스타트처럼
  // 모듈 스코프 상태(inFlightRunPlan Map 등)가 비어있는 상태에서 테스트하기 위함.
  const mod = await import(`../server/ai/aiMarketCycle.js?cachebust=${Math.random()}`)
  return mod.generateAiMarketCycle
}

async function main() {
  const repo = createAiStateRepository({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  await repo.remove(TEST_DEVICE_ID).catch(() => {})

  console.log(`테스트 deviceId: ${TEST_DEVICE_ID}`)

  console.log('\n[1회차] cycle 1 — RunPlan이 없으므로 새로 생성되어야 함')
  const gen1 = await freshGenerateAiMarketCycle()
  const t1 = performance.now()
  const market1 = await gen1({ cycle: 1, deviceId: TEST_DEVICE_ID })
  console.log(`   ${((performance.now() - t1) / 1000).toFixed(1)}s, aiGenerated=${market1.aiGenerated}, scenarioTitle=${market1.scenarioTitle}`)

  const savedAfter1 = await repo.get(TEST_DEVICE_ID)
  console.log(`   저장 확인: runPlan 있음=${!!savedAfter1?.runPlan}, arcs=${savedAfter1?.runPlan?.arcs?.length}, worldState 있음=${!!savedAfter1?.worldState}`)

  console.log('\n[2회차] cycle 2 — 저장된 RunPlan을 재사용해야 함 (RunPlan 재생성 없이 더 빨라야 함)')
  const gen2 = await freshGenerateAiMarketCycle()
  const t2 = performance.now()
  const market2 = await gen2({ cycle: 2, deviceId: TEST_DEVICE_ID })
  const ms2 = performance.now() - t2
  console.log(`   ${(ms2 / 1000).toFixed(1)}s, aiGenerated=${market2.aiGenerated}, scenarioTitle=${market2.scenarioTitle}`)

  const savedAfter2 = await repo.get(TEST_DEVICE_ID)
  const sameRunPlan = JSON.stringify(savedAfter1.runPlan) === JSON.stringify(savedAfter2.runPlan)
  console.log(`   RunPlan 동일 여부(재사용됐는지): ${sameRunPlan ? '✅ 동일 (재사용 성공)' : '❌ 다름 (재생성됨 — 버그)'}`)
  console.log(`   worldState 갱신 여부: ${JSON.stringify(savedAfter1.worldState) !== JSON.stringify(savedAfter2.worldState) ? '✅ 갱신됨' : '⚠️ 안 바뀜'}`)

  await repo.remove(TEST_DEVICE_ID)
  console.log('\n테스트 데이터 정리 완료.')

  if (!sameRunPlan) {
    console.error('\n❌ 실패: RunPlan이 재사용되지 않았습니다.')
    process.exitCode = 1
  } else {
    console.log('\n✅ 성공: 콜드 스타트 흉내(모듈 재import)에도 RunPlan이 Turso에서 재사용됐습니다.')
  }
}

main().catch((err) => {
  console.error('실패:', err)
  process.exitCode = 1
})
