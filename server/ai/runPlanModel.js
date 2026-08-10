// "가장 중요한 전체 서사 모델" — Claude Opus 5 high (비용·속도·품질 실측 후 고정).
// 런 시작 시 딱 한 번 호출해서 에필로그를 포함한 7주기 전체를 아우르는 RunPlan을 만든다.
// (server/ai/config.js의 MODEL_TIERS.narrative.model 한 곳만 고치면 다른 모델로 교체 가능)
//
// RunPlan은 run_plan_pool에 미리 생성하며, Opus 5의 high가 max와 비슷한 아크 밀도를
// 유지하면서 비용과 생성 시간을 크게 줄여 high를 사용한다.
//
// 2026-08-10: 다양성 프롬프트 도입 이후 20회 표본 중 4회(20%) 관찰된 손상 패턴 대응 —
// JSON 파싱은 정상 성공하지만 arcs가 0개이고 theme/worldTone에 "cannot be used",
// "corrected:", "death ledger" 같은 영어 디버그/에러 메시지스러운 문구가 섞여 나오는
// 조용한 실패였다(stop_reason은 매번 정상 end_turn). 특정 어조/갈등축 조합 탓이 아니라
// 산발적으로 발생해 원인을 특정하지 못했다 — 근본 수정 대신 결과 검증 + 자동 재시도로
// 방어한다. run_plan_pool 배치 스크립트도 이 함수를 그대로 쓰므로 여기 한 곳만 고치면
// 두 경로(라이브 폴백, 배치 시딩) 모두 보호된다.

import { getAnthropicClient } from './clients.js'
import { MODEL_TIERS } from './config.js'
import { RUN_PLAN_SCHEMA } from './schemas.js'
import { RUN_PLAN_SYSTEM_PROMPT, buildRunPlanUserPrompt } from './prompts/runPlan.js'

const MAX_ATTEMPTS = 3

// 실측된 손상 패턴(arcs 0개, worldTone 비어있거나 'placeholder')을 걸러낸다. 완벽한
// 내용 검증은 아니지만(문체·인과관계 품질까지는 못 봄), 지금까지 관찰된 손상 사례는
// 전부 이 기준에 걸렸다.
function isValidRunPlan(runPlan) {
  const arcs = runPlan?.arcs
  if (!Array.isArray(arcs) || arcs.length < 4) return false
  if (typeof runPlan.worldTone !== 'string' || runPlan.worldTone.trim().length < 10) return false
  if (typeof runPlan.theme !== 'string' || runPlan.theme.trim().length < 5) return false
  return arcs.every((arc) => Array.isArray(arc.involvedStockIds) && arc.involvedStockIds.length > 0 && arc.arcId && arc.title)
}

async function generateRunPlanOnce() {
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

/**
 * @returns {Promise<{ runPlan: object, raw: import('@anthropic-ai/sdk').default.Messages.Message }>}
 */
export async function generateRunPlan() {
  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await generateRunPlanOnce()
      if (isValidRunPlan(result.runPlan)) return result
      lastError = new Error(
        `[runPlanModel] 검증 실패(시도 ${attempt}/${MAX_ATTEMPTS}): arcs=${result.runPlan?.arcs?.length ?? 0}개, ` +
        `worldTone=${JSON.stringify(result.runPlan?.worldTone?.slice?.(0, 30))}, theme=${JSON.stringify(result.runPlan?.theme?.slice?.(0, 30))}`
      )
      console.error(lastError.message)
    } catch (err) {
      lastError = err
      console.error(`[runPlanModel] 생성 실패(시도 ${attempt}/${MAX_ATTEMPTS}): ${err.message}`)
    }
  }
  throw lastError
}
