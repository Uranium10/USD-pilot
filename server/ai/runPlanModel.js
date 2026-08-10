// "가장 중요한 전체 서사 모델" — Claude Opus 5 high (비용·속도·품질 실측 후 고정).
// 런 시작 시 딱 한 번 호출해서 에필로그를 포함한 7주기 전체를 아우르는 RunPlan을 만든다.
// (server/ai/config.js의 MODEL_TIERS.narrative.model 한 곳만 고치면 다른 모델로 교체 가능)
//
// RunPlan은 run_plan_pool에 미리 생성하며, Opus 5의 high가 max와 비슷한 아크 밀도를
// 유지하면서 비용과 생성 시간을 크게 줄여 high를 사용한다.

import { getAnthropicClient } from './clients.js'
import { MODEL_TIERS } from './config.js'
import { RUN_PLAN_SCHEMA } from './schemas.js'
import { RUN_PLAN_SYSTEM_PROMPT, buildRunPlanUserPrompt } from './prompts/runPlan.js'

/**
 * @returns {Promise<{ runPlan: object, raw: import('@anthropic-ai/sdk').default.Messages.Message }>}
 */
export async function generateRunPlan() {
  const client = getAnthropicClient()
  const { model } = MODEL_TIERS.narrative

  const stream = client.messages.stream({
    model,
    max_tokens: 16000,
    thinking: { type: 'adaptive', display: 'summarized' },
    output_config: {
      effort: 'high',
      format: {
        type: 'json_schema',
        schema: RUN_PLAN_SCHEMA,
      },
    },
    system: RUN_PLAN_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildRunPlanUserPrompt() }],
  })

  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    throw new Error('[runPlanModel] Claude Opus가 요청을 거부했습니다 (stop_reason=refusal).')
  }

  const textBlock = message.content.find((block) => block.type === 'text')
  if (!textBlock) {
    throw new Error('[runPlanModel] 응답에 text 블록이 없습니다.')
  }

  let runPlan
  try {
    runPlan = JSON.parse(textBlock.text)
  } catch (err) {
    throw new Error(`[runPlanModel] JSON 파싱 실패: ${err.message}\n원본: ${textBlock.text.slice(0, 500)}`)
  }

  return { runPlan, raw: message }
}
