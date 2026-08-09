// "주간 검증 모델" — GPT-5.5 (사용자 지정).
// 사이클 1개(7일치) 분량의 MarketScenarioDraft 초안을 만들고, 동시에 RunPlan과의
// 정합성을 스스로 감사(selfCheck)한다.
//
// 주의: "gpt-5.5"는 이 스킬/코드베이스가 권위 있게 검증할 수 있는 문자열이 아니다
// (OpenAI 쪽 최신 모델 카탈로그는 별도 확인 필요). 존재하지 않거나 이름이 바뀌면
// server/ai/config.js의 MODEL_TIERS.weekly.model 한 곳만 고치면 된다. 구조화된 출력은
// OpenAI Chat Completions의 response_format: json_schema(+ strict)를 사용했다 — 이는
// 여러 세대에 걸쳐 안정적으로 유지되어 온 표준 형태다.

import { getOpenAIClient } from './clients.js'
import { MODEL_TIERS } from './config.js'
import { CYCLE_SCENARIO_SCHEMA } from './schemas.js'
import { CYCLE_SCENARIO_SYSTEM_PROMPT, buildCycleScenarioUserPrompt } from './prompts/cycleScenario.js'

/**
 * @param {{ cycle: number, runPlan: object, worldState?: object }} params
 * @returns {Promise<{ cycleScenario: object, raw: unknown }>}
 */
export async function generateCycleScenario({ cycle, runPlan, worldState }) {
  const client = getOpenAIClient()
  const { model } = MODEL_TIERS.weekly

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: CYCLE_SCENARIO_SYSTEM_PROMPT },
      { role: 'user', content: buildCycleScenarioUserPrompt({ cycle, runPlan, worldState }) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'cycle_scenario',
        schema: CYCLE_SCENARIO_SCHEMA,
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
