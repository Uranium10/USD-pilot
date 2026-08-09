// "가장 중요한 전체 서사 모델" — Claude Opus 4.6 (사용자 지정, 실제 호출로 유효성 확인됨).
// 런 시작 시 딱 한 번 호출해서 6주기 전체를 아우르는 RunPlan을 만든다.
// (server/ai/config.js의 MODEL_TIERS.narrative.model 한 곳만 고치면 다른 모델로 교체 가능)
//
// 2026-08-09: effort를 high→medium→high로 두 번 바꿨다. 처음엔 RunPlan이 매 신규 게임
// 시작마다 그 자리에서 생성돼 플레이어가 직접 로딩 화면에서 기다렸기 때문에 medium으로
// 낮췄었다. 그런데 이후 RunPlan을 run_plan_pool에 미리 채워두고 무작위로 뽑아 쓰는
// 전처리 방식으로 바꾸면서(server/ai/aiMarketCycle.js, scripts/generate-run-plan-pool.mjs)
// 이 호출은 더 이상 플레이어 요청 경로에 있지 않다 — 관리자가 한가할 때 오프라인
// 배치로 돌리는 것뿐이라 지연 시간이 문제되지 않는다. 그래서 "가장 중요한 핵심 서사
// 모델"이라는 원래 취지에 맞게 다시 high로 올렸다. 판단 근거는
// USD-spec/agent_workthrough_3.md 참고.

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
