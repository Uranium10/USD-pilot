#!/usr/bin/env node
// submit-run-plan-batch.mjs로 제출한 배치의 결과를 회수한다. 아직 처리 중이면 상태만
// 보여주고 끝낸다(폴링 루프 없음 — 수동으로 나중에 다시 실행). 완료됐으면 결과를
// runPlanModel.js의 isValidRunPlan()과 동일한 기준으로 검증해 통과분만
// run_plan_pool에 저장하고, 손상/에러 건은 개수만 보고한다.
//
// 사용법: node --env-file=.env.local scripts/collect-run-plan-batch.mjs <batch_id>

import { getAnthropicClient } from '../server/ai/clients.js'
import { createRunPlanPoolRepository } from '../server/runPlanPoolRepository.js'

const batchId = process.argv[2]
if (!batchId) {
  console.error('사용법: node --env-file=.env.local scripts/collect-run-plan-batch.mjs <batch_id>')
  process.exitCode = 1
  process.exit()
}

const client = getAnthropicClient()
const repo = createRunPlanPoolRepository({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// server/ai/runPlanModel.js의 isValidRunPlan()과 동일 기준(2026-08-10 손상 패턴 대응).
function isValidRunPlan(runPlan) {
  const arcs = runPlan?.arcs
  if (!Array.isArray(arcs) || arcs.length < 4) return false
  if (typeof runPlan.worldTone !== 'string' || runPlan.worldTone.trim().length < 10) return false
  if (typeof runPlan.theme !== 'string' || runPlan.theme.trim().length < 5) return false
  return arcs.every((arc) => Array.isArray(arc.involvedStockIds) && arc.involvedStockIds.length > 0 && arc.arcId && arc.title)
}

async function main() {
  const batch = await client.messages.batches.retrieve(batchId)
  console.log(`processing_status: ${batch.processing_status}`)
  console.log(`request_counts: ${JSON.stringify(batch.request_counts)}`)

  if (batch.processing_status !== 'ended') {
    console.log('\n아직 처리 중입니다. 나중에 다시 실행해주세요.')
    return
  }

  const valid = []
  let succeeded = 0
  let invalid = 0
  let errored = 0

  for await (const item of await client.messages.batches.results(batchId)) {
    if (item.result.type !== 'succeeded') {
      errored++
      console.log(`  [${item.custom_id}] ❌ ${item.result.type}`)
      continue
    }
    succeeded++
    const textBlock = item.result.message.content.find((b) => b.type === 'text')
    let runPlan
    try {
      runPlan = textBlock && JSON.parse(textBlock.text)
    } catch {
      runPlan = null
    }
    if (runPlan && isValidRunPlan(runPlan)) {
      valid.push(runPlan)
      console.log(`  [${item.custom_id}] ✅ "${runPlan.theme.slice(0, 50)}" 아크${runPlan.arcs.length}개`)
    } else {
      invalid++
      console.log(`  [${item.custom_id}] ⚠️  검증 실패(손상)`)
    }
  }

  console.log(`\n성공 ${succeeded} / 무효(API) ${errored} / 손상(검증 실패) ${invalid} / 저장 대상 ${valid.length}`)

  if (valid.length) {
    const before = await repo.count()
    await repo.insertMany(valid)
    const after = await repo.count()
    console.log(`run_plan_pool: ${before}개 → ${after}개`)
  }
}

main().catch((err) => {
  console.error('실패:', err)
  process.exitCode = 1
})
