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

const INTERNAL_ID_PATTERN = /\bstock-[1-5]\b/i
const BROKEN_COPY_PATTERN = /\.\.\.|\u2026|placeholder|corrupted/i
const ABSTRACT_COMPARISON_PATTERN = /(?:보다|보다는)\s*[^.!?]{0,30}(?:절차|신뢰도|공정성|시장|평판)(?:이|가|은|는|을|를)/

/**
 * \uD50C\uB808\uC774\uC5B4\uC5D0\uAC8C \uADF8\uB300\uB85C \uB178\uCD9C\uB418\uB294 \uBB38\uC7A5\uACFC, \uCEF4\uD30C\uC77C \uB2E8\uACC4\uC5D0\uC11C \uC870\uC6A9\uD788 \uC720\uC2E4\uB418\uB294 \uAD6C\uC870\uB97C \uAC80\uC0AC\uD55C\uB2E4.
 * @param {object} scenario
 * @param {{ companies?: {id:string,name:string,sector:string}[] }} [context]
 *   companies\uB97C \uB118\uAE30\uBA74 "\uB274\uC2A4\uC758 \uC8FC\uCCB4\uAC00 \uADF8 \uC885\uBAA9\uC774 \uB9DE\uB294\uC9C0"\uAE4C\uC9C0 \uAC80\uC0AC\uD55C\uB2E4(\uC120\uD0DD).
 */
export function findScenarioCopyIssues(scenario, { companies } = {}) {
  const issues = []
  for (const day of scenario?.days || []) {
    const copies = [
      ...(day.events || []).map((event) => [`day ${day.day} headline`, event.headline]),
      ...(day.rumorSeeds || []).map((rumor) => [`day ${day.day} rumor`, rumor.angle]),
    ]
    for (const [label, value] of copies) {
      const copy = String(value || '').trim()
      if (copy.length < 10) issues.push(`${label}: too short`)
      if (copy.length > 180) issues.push(`${label}: too long`)
      if (!/[\uAC00-\uD7A3]/.test(copy)) issues.push(`${label}: no Korean text`)
      if (INTERNAL_ID_PATTERN.test(copy)) issues.push(`${label}: internal stock id`)
      if (BROKEN_COPY_PATTERN.test(copy)) issues.push(`${label}: broken copy marker`)
      if (label.endsWith('headline') && !/다[.!?]?$/.test(copy)) issues.push(`${label}: incomplete predicate`)
      if (ABSTRACT_COMPARISON_PATTERN.test(copy)) issues.push(`${label}: ambiguous abstract comparison`)
    }

    // \uC18C\uBB38\uC774 \uAC19\uC740 \uB0A0\uC758 \uC0AC\uAC74\uC744 \uAC00\uB9AC\uD0A4\uC9C0 \uC54A\uC73C\uBA74 compileScenario()\uAC00 \uADF8 \uC18C\uBB38\uC744 \uD1B5\uC9F8\uB85C
    // \uBC84\uB9B0\uB2E4(aiMarketCycle.js \u2014 eventsById\uB294 \uB0A0\uC9DC \uB2E8\uC704\uB85C \uB9CC\uB4E4\uC5B4\uC9C4\uB2E4). \uC9C0\uAE08\uAE4C\uC9C0\uB294 \uAC80\uC0AC\uAC00
    // \uC5C6\uC5B4\uC11C \uC815\uBCF4 \uC0C1\uC810\uC758 \uD56D\uBAA9\uC774 \uC870\uC6A9\uD788 \uC0AC\uB77C\uC84C\uB2E4. 2026-08-10 Luna low \uC2E4\uCE21\uC5D0\uC11C \uC2E4\uC81C \uBC1C\uC0DD.
    const eventIds = new Set((day.events || []).map((event) => event.eventId))
    for (const rumor of day.rumorSeeds || []) {
      if (!eventIds.has(rumor.targetEventId)) {
        issues.push(`day ${day.day} rumor: orphan target (${rumor.targetEventId})`)
      }
    }
  }
  if ((scenario?.days || []).some((day) => !day.events?.length || !day.rumorSeeds?.length)) {
    issues.push('each day needs at least one event and rumor')
  }
  issues.push(...findSubjectMismatches(scenario, companies))
  issues.push(...findRumorTargetMismatches(scenario, companies))
  return issues
}

// \uD5E4\uB4DC\uB77C\uC778\uC774 \uC790\uAE30 \uC885\uBAA9\uC740 \uC5B8\uAE09\uD558\uC9C0 \uC54A\uC73C\uBA74\uC11C \uB2E4\uB978 \uC0C1\uC7A5\uC0AC\uB9CC \uC5B8\uAE09\uD558\uB294 \uACBD\uC6B0\uB97C \uCC3E\uB294\uB2E4.
// \uD654\uBA74\uC5D0\uC11C\uB294 \uC885\uBAA9\uBA85\uC774 \uBCF8\uBB38 \uC704\uC5D0 \uB530\uB85C \uD45C\uC2DC\uB418\uBBC0\uB85C(MarketDesktop\uC758 LIVE WIRE), \uC774\uB7F0
// \uBB38\uC7A5\uC740 "A \uC885\uBAA9 \uB274\uC2A4\uC778\uB370 \uBCF8\uBB38\uC740 B \uC774\uC57C\uAE30\uB9CC" \uD558\uB294 \uC0C1\uD0DC\uAC00 \uB418\uC5B4 \uC5B4\uC0C9\uD558\uAC8C \uC77D\uD78C\uB2E4.
// \uC5B4\uB5A4 \uAE30\uC5C5\uB3C4 \uC5B8\uAE09\uD558\uC9C0 \uC54A\uB294 \uBB38\uC7A5\uC740 \uC885\uBAA9\uBA85 \uD45C\uC2DC\uAC00 \uADF8\uB300\uB85C \uC8FC\uC5B4 \uC5ED\uD560\uC744 \uD558\uBBC0\uB85C \uD1B5\uACFC\uC2DC\uD0A8\uB2E4.
function findSubjectMismatches(scenario, companies) {
  if (!Array.isArray(companies) || !companies.length) return []
  const nameById = new Map(companies.map((company) => [company.id, company.name]))
  const issues = []
  for (const day of scenario?.days || []) {
    for (const event of day.events || []) {
      const ownName = nameById.get(event.primaryStockId)
      const headline = String(event.headline || '')
      if (!ownName || headline.includes(ownName)) continue
      const other = companies.find(
        (company) => company.id !== event.primaryStockId && headline.includes(company.name)
      )
      if (other) issues.push(`day ${day.day} headline: subject mismatch (${ownName} \u2192 ${other.name})`)
    }
  }
  return issues
}

// 대상 기업명이 생략된 중립적인 정보는 종목명 접두사로 보완할 수 있지만, 다른 상장사만
// 언급하면 잘못된 대상을 가리키므로 재생성한다.
function findRumorTargetMismatches(scenario, companies) {
  if (!Array.isArray(companies) || !companies.length) return []
  const nameById = new Map(companies.map((company) => [company.id, company.name]))
  const issues = []
  for (const day of scenario?.days || []) {
    const eventById = new Map((day.events || []).map((event) => [event.eventId, event]))
    for (const rumor of day.rumorSeeds || []) {
      const event = eventById.get(rumor.targetEventId)
      const ownName = nameById.get(event?.primaryStockId)
      const angle = String(rumor.angle || '')
      if (!ownName || angle.includes(ownName)) continue
      const other = companies.find(
        (company) => company.id !== event?.primaryStockId && angle.includes(company.name)
      )
      if (other) issues.push(`day ${day.day} rumor: subject mismatch (${ownName} → ${other.name})`)
    }
  }
  return issues
}

/**
 * @param {{ cycle: number, runPlan: object, worldState?: object }} params
 * @returns {Promise<{ cycleScenario: object, raw: unknown, issues: string[] }>}
 */
async function generateCycleScenarioOnce({ cycle, runPlan, worldState, companies, model, effort }) {
  const client = getOpenAIClient()
  const outputConfig = cycleScenarioOutputConfig()

  const completion = await client.chat.completions.create({
    model: model || MODEL_TIERS.weekly.model,
    // 2026-08-09: reasoning_effort를 명시하지 않았을 때 실측 latency가 사이클당 68~73초였다
    // (매 주기 정산마다 반복되는 비용이라 RunPlan보다 체감 영향이 더 크다). 'medium'으로
    // 낮춰서 시간·비용을 같이 줄인다 — 실제로 파라미터가 받아들여지는 것도 직접 호출로
    // 확인했다. 근거: USD-spec/agent_workthrough_2.md.
    // model/effort는 인자로 덮어쓸 수 있다(기본값은 server/ai/config.js의 MODEL_TIERS.weekly).
    // 벤치마크가 프로덕션 설정을 건드리지 않고 실제 라이브 경로(재시도·검증 포함)를
    // 그대로 태워 후보 모델을 비교하기 위한 것이다.
    reasoning_effort: effort || MODEL_TIERS.weekly.effort || 'medium',
    messages: [
      { role: 'system', content: outputConfig.prompt },
      { role: 'user', content: buildCycleScenarioUserPrompt({ cycle, runPlan, worldState, companies }) },
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

  return { cycleScenario, raw: completion, issues: findScenarioCopyIssues(cycleScenario, { companies }) }
}

const MAX_ATTEMPTS = 3

/**
 * 검증을 통과할 때까지 최대 3회까지 다시 뽑는다.
 *
 * 2026-08-10: 예전에는 단 한 번 호출하고 문장 검증에 걸리면 예외를 던졌는데, 그러면
 * aiMarketCycle.js가 이를 잡아 그 주차 전체를 결정론적 로컬 생성기로 대체해 버렸다 —
 * 사소한 문장 결함 하나로 AI 서사가 통째로 사라지는 품질 절벽이었다. 재시도가 없었던
 * 이유는 재시도 1회가 곧 플레이어 대기 +20초였기 때문인데, 다음 주 시나리오를 주 시작
 * 시점에 미리 만들게 되면서(프리페치) 그 제약이 사라졌다. 이제 재시도 비용은 시간이
 * 아니라 실패분의 토큰 비용뿐이므로 검증을 훨씬 엄격하게 걸 수 있다.
 *
 * 3회 모두 실패해도 예외를 던지지 않고 가장 결함이 적은 결과를 돌려준다 — 소문 하나가
 * 빠진 AI 시나리오가 AI 서사가 아예 없는 로컬 폴백보다 낫기 때문이다. 파싱 자체가
 * 불가능하거나 응답이 비어 있을 때만 예외가 그대로 올라간다.
 *
 * @param {{ cycle: number, runPlan: object, worldState?: object, companies?: object[] }} params
 * @returns {Promise<{ cycleScenario: object, raw: unknown, issues: string[] }>}
 */
export async function generateCycleScenario({ cycle, runPlan, worldState, companies, model, effort }) {
  let best = null
  let lastError = null
  // 실패한 시도의 사용량도 실제로 청구되므로, 비용 계측이 전체 시도를 볼 수 있게 모은다.
  const attempts = []

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await generateCycleScenarioOnce({ cycle, runPlan, worldState, companies, model, effort })
      attempts.push({ attempt, issues: result.issues, usage: result.raw?.usage })
      if (!result.issues.length) return { ...result, attempts }
      if (!best || result.issues.length < best.issues.length) best = result
      console.error(
        `[cycleScenarioModel] cycle ${cycle} 검증 실패(시도 ${attempt}/${MAX_ATTEMPTS}, ` +
        `결함 ${result.issues.length}건): ${result.issues.slice(0, 5).join(', ')}`
      )
    } catch (error) {
      lastError = error
      console.error(`[cycleScenarioModel] cycle ${cycle} 생성 실패(시도 ${attempt}/${MAX_ATTEMPTS}): ${error.message}`)
    }
  }

  if (best) {
    console.error(
      `[cycleScenarioModel] cycle ${cycle}: ${MAX_ATTEMPTS}회 모두 결함이 남아 가장 나은 결과를 사용합니다 ` +
      `(결함 ${best.issues.length}건).`
    )
    return { ...best, attempts }
  }
  throw lastError || new Error(`[cycleScenarioModel] cycle ${cycle} 시나리오를 생성하지 못했습니다.`)
}
