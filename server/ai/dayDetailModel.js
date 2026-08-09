// "짜잘한 작업" 필러 티어 — server/ai/config.js MODEL_TIERS.filler. 하루치 사건/소문 슬롯을 받아 문장만
// 채운다. cycleSkeletonModel.js가 만든 구조를 절대 바꾸지 않는다 — 날짜별로 독립
// 호출되어 병렬로 돌아간다(server/ai/cycleScenarioParallel.js). 아직 실제 게임에
// 연결되지 않았다. 배경: USD-spec/agent_workthrough_4.md.

import { GoogleGenAI, Type } from '@google/genai'
import { ENV_KEYS, MODEL_TIERS } from './config.js'
import { DAY_DETAIL_SYSTEM_PROMPT, buildDayDetailUserPrompt } from './prompts/dayDetail.js'

let client
function getClient() {
  if (!client) {
    const apiKey = process.env[ENV_KEYS.google]
    if (!apiKey) throw new Error(`[dayDetailModel] 환경변수 ${ENV_KEYS.google}가 설정되어 있지 않습니다.`)
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

// Gemini의 responseSchema는 Claude/OpenAI 쪽 JSON Schema(schemas.js)와 다른 방언이다
// (Type enum, additionalProperties 미지원) — 그래서 별도로 둔다.
const DAY_DETAIL_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ['events', 'rumorSeeds'],
  properties: {
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['eventId', 'headline', 'detail'],
        properties: {
          eventId: { type: Type.STRING },
          headline: { type: Type.STRING },
          detail: { type: Type.STRING },
        },
      },
    },
    rumorSeeds: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['targetEventId', 'angle'],
        properties: {
          targetEventId: { type: Type.STRING },
          angle: { type: Type.STRING },
        },
      },
    },
  },
}

const RETRYABLE_STATUS = new Set([429, 503])
const MAX_RETRIES = 2

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {{ dailyTheme: string, eventSlots: object[], rumorSlots: object[], companyStates: object[] }} params
 * @returns {Promise<{ dayDetail: { events: object[], rumorSeeds: object[] }, raw: unknown }>}
 */
export async function generateDayDetail({ dailyTheme, eventSlots, rumorSlots, companyStates }) {
  const genai = getClient()
  const { model } = MODEL_TIERS.filler

  let response
  let lastError
  // 2026-08-09: 7일치를 동시에 병렬 호출하니 gemini-3.6-flash가 실제로 503
  // "high demand"를 몇 번이고 반복해서 뱉는 걸 확인했다(재현됨, 일회성 아님) — 짧은
  // 백오프를 곁들인 재시도를 추가했다. 429(rate limit)도 같은 방식으로 처리한다.
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await genai.models.generateContent({
        model,
        contents: `${DAY_DETAIL_SYSTEM_PROMPT}\n\n${buildDayDetailUserPrompt({ dailyTheme, eventSlots, rumorSlots, companyStates })}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: DAY_DETAIL_RESPONSE_SCHEMA,
        },
      })
      break
    } catch (err) {
      lastError = err
      if (attempt === MAX_RETRIES || !RETRYABLE_STATUS.has(err.status)) throw err
      await sleep(1000 * (attempt + 1))
    }
  }
  if (!response) throw lastError

  const text = typeof response.text === 'function' ? response.text() : response.text
  if (!text) {
    throw new Error('[dayDetailModel] 응답에서 텍스트를 읽을 수 없습니다.')
  }

  let dayDetail
  try {
    dayDetail = JSON.parse(text)
  } catch (err) {
    throw new Error(`[dayDetailModel] JSON 파싱 실패: ${err.message}\n원본: ${text.slice(0, 500)}`)
  }

  return { dayDetail, raw: response }
}
