#!/usr/bin/env node

import { createClient } from '@libsql/client'
import { generateMarketCycle } from '../src/data/generateMarket.js'
import { compileScenario } from '../server/ai/aiMarketCycle.js'
import { getGoogleClient, getOpenAIClient } from '../server/ai/clients.js'
import { MODEL_TIERS } from '../server/ai/config.js'
import { cycleScenarioOutputConfig, findScenarioCopyIssues } from '../server/ai/cycleScenarioModel.js'
import { buildCycleScenarioUserPrompt } from '../server/ai/prompts/cycleScenario.js'

const PRICING_BY_MODEL = {
  'gpt-5.6-terra': { input: 2.5, cachedInput: 0.25, cacheWrite: 3.125, output: 15 },
  'gpt-5.6-luna': { input: 1, cachedInput: 0.1, cacheWrite: 1.25, output: 6 },
  'gemini-3.6-flash': { input: 1.5, cachedInput: 0.15, cacheWrite: 0, output: 7.5 },
  'gemini-3.5-flash-lite': { input: 0.3, cachedInput: 0.03, cacheWrite: 0, output: 2.5 },
}
function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const MODEL = option('model', MODEL_TIERS.weekly.model)
const REASONING_EFFORT = option('effort', 'medium')
const REGENERATE_ON_FAILURE = process.argv.includes('--regenerate-on-failure')
const ALWAYS_REVISE = process.argv.includes('--always-revise')
const RUN_PLAN_IDS = option('run-plan-ids', '')
  .split(',')
  .map((id) => Number(id.trim()))
  .filter(Number.isInteger)
const PRICING = PRICING_BY_MODEL[MODEL]
const STOCK_IDS = new Set(['stock-1', 'stock-2', 'stock-3', 'stock-4', 'stock-5'])
const RUN_COUNT = RUN_PLAN_IDS.length || 2
const CYCLES = 7

function openAiUsageOf(completion) {
  const usage = completion.usage || {}
  const promptDetails = usage.prompt_tokens_details || {}
  const completionDetails = usage.completion_tokens_details || {}
  return {
    input: Number(usage.prompt_tokens || 0),
    cachedInput: Number(promptDetails.cached_tokens || 0),
    cacheWrite: Number(promptDetails.cache_write_tokens || 0),
    output: Number(usage.completion_tokens || 0),
    reasoning: Number(completionDetails.reasoning_tokens || 0),
  }
}

function geminiUsageOf(response) {
  const usage = response.usageMetadata || {}
  return {
    input: Number(usage.promptTokenCount || 0),
    cachedInput: Number(usage.cachedContentTokenCount || 0),
    cacheWrite: 0,
    output: Number(usage.candidatesTokenCount || 0) + Number(usage.thoughtsTokenCount || 0),
    reasoning: Number(usage.thoughtsTokenCount || 0),
  }
}

function costOf(usage) {
  const regularInput = Math.max(0, usage.input - usage.cachedInput - usage.cacheWrite)
  return (
    regularInput * PRICING.input
    + usage.cachedInput * PRICING.cachedInput
    + usage.cacheWrite * PRICING.cacheWrite
    + usage.output * PRICING.output
  ) / 1e6
}

function evaluateScenario(scenario, cycle, companies) {
  const failures = []
  const days = scenario?.days || []
  if (scenario?.cycle !== cycle) failures.push('cycle')
  if (scenario?.selfCheck?.consistentWithRunPlan !== true) failures.push('selfCheck')
  if (days.length !== 7 || new Set(days.map((day) => day.day)).size !== 7) failures.push('days')

  const events = days.flatMap((day) => day.events || [])
  const rumors = days.flatMap((day) => day.rumorSeeds || [])
  const eventIds = new Set(events.map((event) => event.eventId))
  const coveredStocks = new Set(events.map((event) => event.primaryStockId))
  if (events.length < 10) failures.push('event-volume')
  if (rumors.length < 7) failures.push('rumor-volume')
  if ([...coveredStocks].filter((id) => STOCK_IDS.has(id)).length < 4) failures.push('stock-coverage')
  if (eventIds.size !== events.length) failures.push('duplicate-event-id')
  const orphanRumors = days.reduce((total, day) => {
    const dayEventIds = new Set((day.events || []).map((event) => event.eventId))
    return total + (day.rumorSeeds || []).filter((rumor) => !dayEventIds.has(rumor.targetEventId)).length
  }, 0)
  if (orphanRumors) failures.push('orphan-rumor')
  if (events.some((event) => !STOCK_IDS.has(event.primaryStockId))) failures.push('invalid-stock-event')

  const headlines = events.map((event) => String(event.headline || '').trim())
  const angles = rumors.map((rumor) => String(rumor.angle || '').trim())
  if (new Set(headlines).size !== headlines.length) failures.push('duplicate-headline')
  const copyIssues = findScenarioCopyIssues(scenario)
  if (copyIssues.length) failures.push(`copy:${copyIssues.length}`)
  const copies = [...headlines, ...angles]
  const completeCopies = copies.filter((copy) => /[.!?]$/.test(copy)).length
  if (completeCopies !== copies.length) failures.push('sentence-completeness')
  const namedHeadlines = headlines.filter((headline) => companies.some((company) => headline.includes(company.name))).length

  return {
    score: Math.max(0, 100 - failures.length * 10),
    failures,
    copyIssues,
    events: events.length,
    rumors: rumors.length,
    orphanRumors,
    coveredStocks: coveredStocks.size,
    sentenceCompleteness: copies.length ? completeCopies / copies.length : 0,
    namedHeadlineRate: headlines.length ? namedHeadlines / headlines.length : 0,
  }
}

const BLOCKING_FAILURES = new Set([
  'cycle',
  'selfCheck',
  'days',
  'duplicate-event-id',
  'orphan-rumor',
  'invalid-stock-event',
  'duplicate-headline',
  'sentence-completeness',
])

function passesValidation(quality) {
  return quality.copyIssues.length === 0
    && !quality.failures.some((failure) => BLOCKING_FAILURES.has(failure))
}

const sum = (items, key) => items.reduce((total, item) => total + item[key], 0)
const average = (items, key) => items.length ? sum(items, key) / items.length : 0

async function loadRunPlans() {
  const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
  if (!RUN_PLAN_IDS.length) {
    const result = await client.execute(`
      SELECT id, run_plan_json
      FROM run_plan_pool
      ORDER BY RANDOM()
      LIMIT ${RUN_COUNT}
    `)
    return result.rows.map((row) => ({ id: Number(row.id), runPlan: JSON.parse(String(row.run_plan_json)) }))
  }

  const placeholders = RUN_PLAN_IDS.map(() => '?').join(', ')
  const result = await client.execute({
    sql: `SELECT id, run_plan_json FROM run_plan_pool WHERE id IN (${placeholders})`,
    args: RUN_PLAN_IDS,
  })
  const plansById = new Map(result.rows.map((row) => [Number(row.id), JSON.parse(String(row.run_plan_json))]))
  return RUN_PLAN_IDS.filter((id) => plansById.has(id)).map((id) => ({ id, runPlan: plansById.get(id) }))
}

const RETRYABLE_STATUS = new Set([429, 503])

function buildRevisionPrompt({ basePrompt, scenario, quality, companies }) {
  return `${basePrompt}

[의무 수정 작업]
아래 초안은 같은 모델이 1차 생성한 결과다. 초안을 그대로 반복하지 말고 다음 항목을 전부 검토해 수정한 완성본을 출력하라.
- 기업-업종 매핑을 다시 확인한다. 기업이 자기 업종과 무관한 제품을 개발하거나 시설을 직접 운영하게 만들지 마라. RunPlan 사건이 업종과 맞지 않으면 해당 기업에 미치는 계약·공급·투자·손실 영향으로 자연스럽게 재해석하라.
- 비문, 오기, 부자연스러운 명사 결합, 과장된 번역투를 자연스럽고 구체적인 한국어로 고친다.
- 각 rumorSeed는 반드시 같은 day 안에 존재하는 eventId를 targetEventId로 참조하게 한다.
- 7일 모두 뉴스와 정보를 유지하고, 서사상 무리하지 않는 범위에서 주간 사건을 총 10개 이상으로 보강한다.
- cycle, day, stock ID, enum 값과 JSON 스키마는 바꾸지 않는다.

기업-업종 매핑:
${JSON.stringify(companies)}

1차 로컬 검증 결과:
${JSON.stringify(quality.failures)}

수정할 1차 초안:
${JSON.stringify(scenario)}`
}

async function generateCycle(client, { cycle, runPlan, worldState, companies, revisionScenario, revisionQuality }) {
  const outputConfig = cycleScenarioOutputConfig()
  const basePrompt = buildCycleScenarioUserPrompt({ cycle, runPlan, worldState, companies })
  const userPrompt = revisionScenario
    ? buildRevisionPrompt({ basePrompt, scenario: revisionScenario, quality: revisionQuality, companies })
    : basePrompt
  const startedAt = performance.now()
  if (MODEL.startsWith('gemini-')) {
    let response
    for (let attempt = 0; attempt <= 2; attempt += 1) {
      try {
        response = await client.models.generateContent({
          model: MODEL,
          contents: userPrompt,
          config: {
            systemInstruction: outputConfig.prompt,
            responseMimeType: 'application/json',
            responseJsonSchema: outputConfig.schema,
            thinkingConfig: { thinkingLevel: REASONING_EFFORT },
          },
        })
        break
      } catch (error) {
        if (attempt === 2 || !RETRYABLE_STATUS.has(error.status)) throw error
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
    const elapsedSeconds = (performance.now() - startedAt) / 1000
    const raw = typeof response.text === 'function' ? response.text() : response.text
    const scenario = JSON.parse(raw)
    const usage = geminiUsageOf(response)
    return { scenario, elapsedSeconds, usage, cost: costOf(usage) }
  }

  const completion = await client.chat.completions.create({
    model: MODEL,
    reasoning_effort: REASONING_EFFORT,
    messages: [
      { role: 'system', content: outputConfig.prompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'cycle_scenario', schema: outputConfig.schema, strict: true },
    },
  })
  const elapsedSeconds = (performance.now() - startedAt) / 1000
  const scenario = JSON.parse(completion.choices[0].message.content)
  const usage = openAiUsageOf(completion)
  return { scenario, elapsedSeconds, usage, cost: costOf(usage) }
}

async function main() {
  if (!PRICING) throw new Error(`지원하지 않는 가격표 모델입니다: ${MODEL}`)
  const plans = await loadRunPlans()
  if (plans.length !== RUN_COUNT) throw new Error(`RunPlan ${RUN_COUNT}개를 불러오지 못했습니다.`)

  const firstMarket = generateMarketCycle({ cycle: 1, seed: 20260810 })
  const companyIds = firstMarket.companyIds
  const companies = firstMarket.days[0].stocks
    .filter((stock) => STOCK_IDS.has(stock.id))
    .map(({ id, name, sector }) => ({ id, name, sector }))
  const client = MODEL.startsWith('gemini-') ? getGoogleClient() : getOpenAIClient()
  const report = {
    measuredAt: new Date().toISOString(),
    model: MODEL,
    reasoningEffort: REASONING_EFFORT,
    regenerateOnFailure: REGENERATE_ON_FAILURE,
    alwaysRevise: ALWAYS_REVISE,
    pricingPerMillionTokens: PRICING,
    companies,
    runs: [],
  }

  for (let runIndex = 0; runIndex < plans.length; runIndex += 1) {
    const { id, runPlan } = plans[runIndex]
    let worldState = null
    const cycles = []
    console.log(`\n[Run ${runIndex + 1}] pool id=${id} | ${runPlan.theme}`)

    for (let cycle = 1; cycle <= CYCLES; cycle += 1) {
      const attempts = []
      const maxAttempts = ALWAYS_REVISE || REGENERATE_ON_FAILURE ? 2 : 1
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const firstAttempt = attempts[0]
        const result = await generateCycle(client, {
          cycle,
          runPlan,
          worldState,
          companies,
          revisionScenario: ALWAYS_REVISE && attempt === 2 ? firstAttempt.result.scenario : null,
          revisionQuality: ALWAYS_REVISE && attempt === 2 ? firstAttempt.quality : null,
        })
        const quality = evaluateScenario(result.scenario, cycle, companies)
        const accepted = passesValidation(quality)
        const attemptMarket = generateMarketCycle({ cycle, seed: 20260810 + cycle, companyIds })
        const attemptCompiled = compileScenario(attemptMarket, result.scenario)
        const sampleNews = attemptCompiled.days[0].news.find((item) => item.stockId !== 'stock-sisyphus')?.text || '(AI 뉴스 없음)'
        const sampleRumor = attemptCompiled.days[0].rumors.find((item) => /^ai-/.test(item.id))?.text || '(AI 정보 없음)'
        attempts.push({ result, quality, accepted, sampleNews, sampleRumor })
        console.log(
          `  c${cycle} ${attempt === 1 ? 'draft' : 'revision'} ${attempt}/${maxAttempts}: ${result.elapsedSeconds.toFixed(1)}s $${result.cost.toFixed(4)}`
          + ` input=${result.usage.input} cached=${result.usage.cachedInput} output=${result.usage.output}`
          + ` reasoning=${result.usage.reasoning} score=${quality.score} accepted=${accepted}`,
        )
        console.log(`    뉴스: ${sampleNews}`)
        console.log(`    정보: ${sampleRumor}`)
        if (ALWAYS_REVISE && attempt === 1) {
          console.log(`    의무 수정 호출 — 1차 검증(${quality.failures.join(', ') || '통과'})`)
          continue
        }
        if (accepted) break
        if (attempt < maxAttempts) console.log(`    검증 실패(${quality.failures.join(', ')}) — 1회 재생성`)
      }

      const finalAttempt = attempts.at(-1)
      const { result, quality, accepted: acceptedByLiveValidation } = finalAttempt
      const { sampleNews, sampleRumor } = finalAttempt
      if (acceptedByLiveValidation) worldState = result.scenario.nextWorldState

      const aggregateUsage = attempts.reduce((total, item) => ({
        input: total.input + item.result.usage.input,
        cachedInput: total.cachedInput + item.result.usage.cachedInput,
        cacheWrite: total.cacheWrite + item.result.usage.cacheWrite,
        output: total.output + item.result.usage.output,
        reasoning: total.reasoning + item.result.usage.reasoning,
      }), { input: 0, cachedInput: 0, cacheWrite: 0, output: 0, reasoning: 0 })
      cycles.push({
        cycle,
        elapsedSeconds: attempts.reduce((total, item) => total + item.result.elapsedSeconds, 0),
        cost: attempts.reduce((total, item) => total + item.result.cost, 0),
        usage: aggregateUsage,
        generationAttempts: attempts.length,
        quality,
        acceptedByLiveValidation,
        sampleNews,
        sampleRumor,
        attempts: attempts.map((item, index) => ({
          attempt: index + 1,
          elapsedSeconds: item.result.elapsedSeconds,
          cost: item.result.cost,
          usage: item.result.usage,
          quality: item.quality,
          accepted: item.accepted,
          sampleNews: item.sampleNews,
          sampleRumor: item.sampleRumor,
        })),
      })
    }

    const runSummary = {
      id,
      theme: runPlan.theme,
      cycles,
      totals: {
        seconds: sum(cycles, 'elapsedSeconds'),
        cost: sum(cycles, 'cost'),
        inputTokens: cycles.reduce((total, cycle) => total + cycle.usage.input, 0),
        cachedInputTokens: cycles.reduce((total, cycle) => total + cycle.usage.cachedInput, 0),
        outputTokens: cycles.reduce((total, cycle) => total + cycle.usage.output, 0),
        reasoningTokens: cycles.reduce((total, cycle) => total + cycle.usage.reasoning, 0),
        averageScore: average(cycles.map((cycle) => cycle.quality), 'score'),
        averageSentenceCompleteness: average(cycles.map((cycle) => cycle.quality), 'sentenceCompleteness'),
        acceptedCycles: cycles.filter((cycle) => cycle.acceptedByLiveValidation).length,
        generationCalls: cycles.reduce((total, cycle) => total + cycle.generationAttempts, 0),
        regeneratedCycles: cycles.filter((cycle) => cycle.generationAttempts > 1).length,
      },
    }
    report.runs.push(runSummary)
  }

  const allCycles = report.runs.flatMap((run) => run.cycles)
  report.overall = {
    seconds: sum(allCycles, 'elapsedSeconds'),
    cost: sum(allCycles, 'cost'),
    inputTokens: allCycles.reduce((total, cycle) => total + cycle.usage.input, 0),
    cachedInputTokens: allCycles.reduce((total, cycle) => total + cycle.usage.cachedInput, 0),
    outputTokens: allCycles.reduce((total, cycle) => total + cycle.usage.output, 0),
    reasoningTokens: allCycles.reduce((total, cycle) => total + cycle.usage.reasoning, 0),
    averageSecondsPerCycle: average(allCycles, 'elapsedSeconds'),
    averageCostPerCycle: average(allCycles, 'cost'),
    averageScore: average(allCycles.map((cycle) => cycle.quality), 'score'),
    acceptedCycles: allCycles.filter((cycle) => cycle.acceptedByLiveValidation).length,
    generationCalls: allCycles.reduce((total, cycle) => total + cycle.generationAttempts, 0),
    regeneratedCycles: allCycles.filter((cycle) => cycle.generationAttempts > 1).length,
  }

  console.log('\n---RESULT_JSON---')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
