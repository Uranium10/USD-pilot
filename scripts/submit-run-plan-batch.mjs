#!/usr/bin/env node
// Batches API로 RunPlan N개를 비동기 예약한다(정가 대비 50% 할인, 최대 24시간 내 완료,
// 보통 1시간 이내). 라이브 경로(runPlanModel.js)와 달리 스트리밍이 아니라 요청을 큐에
// 넣고 나중에 결과를 가져오는 방식이라, 여기서는 제출만 하고 폴링하지 않는다.
// 각 요청은 buildRunPlanUserPrompt()를 개별 호출해 어조/갈등축 다양성을 유지한다.
//
// 사용법: node --env-file=.env.local scripts/submit-run-plan-batch.mjs [개수]
// 결과 회수는 scripts/collect-run-plan-batch.mjs <batch_id>로 나중에 진행.

import { getAnthropicClient } from '../server/ai/clients.js'
import { MODEL_TIERS } from '../server/ai/config.js'
import { RUN_PLAN_SCHEMA } from '../server/ai/schemas.js'
import { RUN_PLAN_SYSTEM_PROMPT, buildRunPlanUserPrompt } from '../server/ai/prompts/runPlan.js'

const count = Number(process.argv[2]) || 20
const client = getAnthropicClient()
const { model } = MODEL_TIERS.narrative

function buildParams() {
  return {
    model,
    max_tokens: 16000,
    thinking: { type: 'adaptive', display: 'summarized' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: RUN_PLAN_SCHEMA },
    },
    system: RUN_PLAN_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildRunPlanUserPrompt() }],
  }
}

async function main() {
  const requests = Array.from({ length: count }, (_, i) => ({
    custom_id: `runplan-${Date.now()}-${i + 1}`,
    params: buildParams(),
  }))

  console.log(`${model} (effort=high)로 ${count}개 배치 요청 제출 중...`)
  const batch = await client.messages.batches.create({ requests })

  console.log('\n제출 완료.')
  console.log(`batch_id: ${batch.id}`)
  console.log(`processing_status: ${batch.processing_status}`)
  console.log(`request_counts: ${JSON.stringify(batch.request_counts)}`)
  console.log(`\n나중에 결과 회수:`)
  console.log(`  node --env-file=.env.local scripts/collect-run-plan-batch.mjs ${batch.id}`)
}

main().catch((err) => {
  console.error('실패:', err)
  process.exitCode = 1
})
