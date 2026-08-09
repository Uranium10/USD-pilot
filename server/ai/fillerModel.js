// "출력 4줄 이내의 짜잘한 작업" 담당 — gemini-3.5-flash (server/ai/config.js MODEL_TIERS.filler 참고).
// 소문 플레이버 문구, 필드 단위 짧은 복구(repair) 등 값싸고 빠른 텍스트 생성에 쓴다.
// for_agent_plan.md §8이 언급하는 "검증 실패 시 서버에서 최대 한 번의 짧은 복구 시도"의
// 실제 실행 모델로 쓰기에 적합하다 (아직 연결은 안 함 — 이 파일은 독립적으로 호출 가능한
// 상태로만 구현되어 있다).

import { getGoogleClient } from './clients.js'
import { MODEL_TIERS } from './config.js'

const MAX_LINES = 4

/**
 * 최대 4줄 이내의 짧은 텍스트를 생성한다.
 * @param {{ instruction: string, context?: string }} params
 * @returns {Promise<string>}
 */
export async function generateFillerText({ instruction, context }) {
  const client = getGoogleClient()
  const { model } = MODEL_TIERS.filler

  const prompt = [
    `다음 지시에 따라 ${MAX_LINES}줄 이내의 짧은 한국어 텍스트만 출력해줘. 설명이나 접두사 없이 결과물만 출력할 것.`,
    context ? `맥락: ${context}` : null,
    `지시: ${instruction}`,
  ]
    .filter(Boolean)
    .join('\n')

  const response = await client.models.generateContent({ model, contents: prompt })

  const text = typeof response.text === 'function' ? response.text() : response.text
  if (!text) {
    throw new Error('[fillerModel] Gemini 응답에서 텍스트를 읽을 수 없습니다.')
  }

  const trimmed = text.trim()
  const lines = trimmed.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length > MAX_LINES) {
    // 모델이 지시를 넘겨 길게 답했을 경우를 대비한 방어적 절삭.
    return lines.slice(0, MAX_LINES).join('\n')
  }
  return trimmed
}

/**
 * 예시 용도: CycleScenario의 특정 필드 하나가 검증에 실패했을 때, 그 필드만
 * 싸고 빠르게 다시 생성하는 복구(repair) 헬퍼. (아직 검증 파이프라인에 연결되지 않음)
 * @param {{ fieldName: string, fieldDescription: string, invalidValue: unknown, reason: string }} params
 */
export async function repairField({ fieldName, fieldDescription, invalidValue, reason }) {
  return generateFillerText({
    instruction: `필드 "${fieldName}"(${fieldDescription})의 값을 다시 만들어줘. ` +
      `기존 값이 다음 이유로 거부됐다: ${reason}. 새 값 텍스트만 출력.`,
    context: `기존(잘못된) 값: ${JSON.stringify(invalidValue)}`,
  })
}
