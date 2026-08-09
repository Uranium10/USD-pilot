// 실험적 대안(2026-08-09): CycleScenario 생성을 "구조 설계"(이 파일, weekly 티어)와
// "날짜별 문장 작성"(dayDetailModel.js, filler 티어 병렬)으로 나눈 것의 앞부분.
// 모델 문자열은 server/ai/config.js MODEL_TIERS 참고.
// 출력량이 cycleScenarioModel.js보다 훨씬 적다(문장 없이 구조+briefNote만) — 그만큼
// 빨라질 것으로 기대하고 실측 비교한다. 아직 실제 게임에 연결되지 않았다.
// 배경: USD-spec/agent_workthrough_4.md.

import { getOpenAIClient } from './clients.js'
import { MODEL_TIERS } from './config.js'
import { CYCLE_SKELETON_SCHEMA } from './schemas.js'
import { CYCLE_SKELETON_SYSTEM_PROMPT, buildCycleSkeletonUserPrompt } from './prompts/cycleSkeleton.js'

/**
 * @param {{ cycle: number, runPlan: object, worldState?: object }} params
 * @returns {Promise<{ cycleSkeleton: object, raw: unknown }>}
 */
export async function generateCycleSkeleton({ cycle, runPlan, worldState }) {
  const client = getOpenAIClient()
  const { model } = MODEL_TIERS.weekly

  const completion = await client.chat.completions.create({
    model,
    reasoning_effort: 'medium',
    messages: [
      { role: 'system', content: CYCLE_SKELETON_SYSTEM_PROMPT },
      { role: 'user', content: buildCycleSkeletonUserPrompt({ cycle, runPlan, worldState }) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'cycle_skeleton',
        schema: CYCLE_SKELETON_SCHEMA,
        strict: true,
      },
    },
  })

  const raw = completion.choices?.[0]?.message?.content
  if (!raw) {
    throw new Error('[cycleSkeletonModel] 응답에 content가 없습니다.')
  }

  let cycleSkeleton
  try {
    cycleSkeleton = JSON.parse(raw)
  } catch (err) {
    throw new Error(`[cycleSkeletonModel] JSON 파싱 실패: ${err.message}\n원본: ${raw.slice(0, 500)}`)
  }

  return { cycleSkeleton, raw: completion }
}
