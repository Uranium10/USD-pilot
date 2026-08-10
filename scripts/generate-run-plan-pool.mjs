#!/usr/bin/env node
// run_plan_pool을 채우는 배치 스크립트. 관리자가 한가할 때(또는 지금처럼 초기 시딩할 때)
// 수동으로 돌린다 — 플레이어 요청 경로와 완전히 분리되어 있어 effort=high로 마음껏
// 돌려도 게임 체감 지연에 영향 없다. 실패한 항목은 건너뛰고 계속 진행한다(전체를
// 재시도하지 않아도 되도록).
//
// 사용법:
//   node --env-file=.env.local scripts/generate-run-plan-pool.mjs [개수] [동시실행수]
//   기본값: 개수=10, 동시실행수=5
//
// 예: 30개를 동시 5개씩 생성
//   node --env-file=.env.local scripts/generate-run-plan-pool.mjs 30 5

import { generateRunPlan } from '../server/ai/runPlanModel.js'
import { MODEL_TIERS } from '../server/ai/config.js'
import { createRunPlanPoolRepository } from '../server/runPlanPoolRepository.js'

const count = Number(process.argv[2]) || 10
const concurrency = Number(process.argv[3]) || 5

const repo = createRunPlanPoolRepository({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function generateOne(index) {
  const start = performance.now()
  try {
    const { runPlan, raw } = await generateRunPlan()
    const ms = performance.now() - start
    console.log(`  [${index}] ✅ "${runPlan.theme}" (아크 ${runPlan.arcs?.length}개, ${(ms / 1000).toFixed(1)}s, out=${raw.usage.output_tokens}토큰)`)
    return runPlan
  } catch (error) {
    console.error(`  [${index}] ❌ 실패: ${error.message}`)
    return null
  }
}

async function runBatch(items, worker, workerCount) {
  const results = []
  let cursor = 0
  async function next() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(workerCount, items.length) }, next))
  return results
}

async function main() {
  const before = await repo.count()
  console.log(`현재 풀 크기: ${before}개`)
  console.log(`${count}개를 동시 ${concurrency}개씩 생성합니다 (${MODEL_TIERS.narrative.model}, effort=high)...\n`)

  const indices = Array.from({ length: count }, (_, i) => i + 1)
  const generated = await runBatch(indices, generateOne, concurrency)
  const successful = generated.filter(Boolean)

  if (successful.length) {
    await repo.insertMany(successful)
  }

  const after = await repo.count()
  console.log(`\n성공 ${successful.length}/${count}개 저장 완료.`)
  console.log(`풀 크기: ${before}개 → ${after}개`)
}

main().catch((err) => {
  console.error('실패:', err)
  process.exitCode = 1
})
