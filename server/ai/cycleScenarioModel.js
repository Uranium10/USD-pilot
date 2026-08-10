// "주간 검증 모델" — server/ai/config.js MODEL_TIERS.weekly (사용자 지정, 2026-08-09
// gpt-5.5 → gpt-5.6-terra로 교체됨). 사이클 1개(7일치) 분량의 MarketScenarioDraft
// 초안을 만들고, 동시에 RunPlan과의 정합성을 스스로 감사(selfCheck)한다.
//
// 모델 문자열은 실제 API 호출 + developers.openai.com/api/docs/pricing 조회로 매번
// 존재·가격을 확인해왔다(gpt-5.6-terra: $2/$12 per 1M, short context). 구조화된 출력은
// OpenAI Chat Completions의 response_format: json_schema(+ strict)를 사용했다 — 여러
// 세대에 걸쳐 안정적으로 유지되어 온 표준 형태다.

import { getOpenAIClient } from './clients.js'
import { MODEL_TIERS } from './config.js'
import { CYCLE_SCENARIO_SCHEMA, CYCLE_SCENARIO_VERBOSE_SCHEMA } from './schemas.js'
import { CYCLE_SCENARIO_SYSTEM_PROMPT, CYCLE_SCENARIO_VERBOSE_SYSTEM_PROMPT, buildCycleScenarioUserPrompt } from './prompts/cycleScenario.js'

export function cycleScenarioOutputConfig(mode = process.env.AI_CYCLE_SCHEMA_MODE) {
  const verbose = mode === 'verbose'
  return {
    prompt: verbose ? CYCLE_SCENARIO_VERBOSE_SYSTEM_PROMPT : CYCLE_SCENARIO_SYSTEM_PROMPT,
    schema: verbose ? CYCLE_SCENARIO_VERBOSE_SCHEMA : CYCLE_SCENARIO_SCHEMA,
  }
}

/**
 * @param {{ cycle: number, runPlan: object, worldState?: object }} params
 * @returns {Promise<{ cycleScenario: object, raw: unknown }>}
 */
export async function generateCycleScenario({ cycle, runPlan, worldState }) {
  const client = getOpenAIClient()
  const { model } = MODEL_TIERS.weekly
  const outputConfig = cycleScenarioOutputConfig()

  const completion = await client.chat.completions.create({
    model,
    // 2026-08-09: reasoning_effort를 명시하지 않았을 때 실측 latency가 사이클당 68~73초였다
    // (매 주기 정산마다 반복되는 비용이라 RunPlan보다 체감 영향이 더 크다). 'medium'으로
    // 낮춰서 시간·비용을 같이 줄인다 — 실제로 파라미터가 받아들여지는 것도 직접 호출로
    // 확인했다. 근거: USD-spec/agent_workthrough_2.md.
    reasoning_effort: 'medium',
    messages: [
      { role: 'system', content: outputConfig.prompt },
      { role: 'user', content: buildCycleScenarioUserPrompt({ cycle, runPlan, worldState }) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'cycle_scenario',
        schema: outputConfig.schema,
        strict: true,
      },
    },
  })

  const raw = completion.choices?.[0]?.message?.content
  if (!raw) {
    throw new Error('[cycleScenarioModel] 응답에 content가 없습니다.')
  }

  let cycleScenario
  try {
    cycleScenario = JSON.parse(raw)
  } catch (err) {
    throw new Error(`[cycleScenarioModel] JSON 파싱 실패: ${err.message}\n원본: ${raw.slice(0, 500)}`)
  }

  return { cycleScenario, raw: completion }
}
