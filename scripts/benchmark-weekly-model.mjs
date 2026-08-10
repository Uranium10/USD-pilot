#!/usr/bin/env node
// 동일 RunPlan/주차로 주간 모델 후보를 비교한다.
// 실행: node --env-file=.env.local scripts/benchmark-weekly-model.mjs

import { createRunPlanPoolRepository } from '../server/runPlanPoolRepository.js'
import { getOpenAIClient } from '../server/ai/clients.js'
import { CYCLE_SCENARIO_SCHEMA } from '../server/ai/schemas.js'
import { CYCLE_SCENARIO_SYSTEM_PROMPT, buildCycleScenarioUserPrompt } from '../server/ai/prompts/cycleScenario.js'

const ALL_VARIANTS = [
  { name: 'terra-medium', model: 'gpt-5.6-terra', effort: 'medium', input: 2.5, cached: 0.25, output: 15 },
  { name: 'terra-low', model: 'gpt-5.6-terra', effort: 'low', input: 2.5, cached: 0.25, output: 15 },
  { name: 'terra-none', model: 'gpt-5.6-terra', effort: 'none', input: 2.5, cached: 0.25, output: 15 },
  { name: 'luna-medium', model: 'gpt-5.6-luna', effort: 'medium', input: 1, cached: 0.1, output: 6 },
]
const VARIANTS = process.argv.includes('--quick') ? ALL_VARIANTS.slice(0, 1) : ALL_VARIANTS
const REPEATS = 2
const CYCLE = 4
const STOCK_IDS = new Set(['stock-1', 'stock-2', 'stock-3', 'stock-4', 'stock-5'])

function scoreScenario(value) {
  const failures = []
  const stockStates = value.companyStates || []
  const days = value.days || []
  if (value.cycle !== CYCLE) failures.push('cycle')
  if (!value.selfCheck?.consistentWithRunPlan) failures.push('selfCheck')
  if (stockStates.length && (stockStates.length !== 5 || new Set(stockStates.map((item) => item.stockId)).size !== 5)) failures.push('companyStates')
  if (days.length !== 7 || new Set(days.map((day) => day.day)).size !== 7) failures.push('days')

  const allEvents = days.flatMap((day) => day.events || [])
  const allRumors = days.flatMap((day) => day.rumorSeeds || [])
  const eventIds = new Set(allEvents.map((event) => event.eventId))
  const coveredStocks = new Set(allEvents.map((event) => event.primaryStockId))
  if (allEvents.length < 10) failures.push('event-volume')
  if (allRumors.length < 5) failures.push('rumor-volume')
  if ([...coveredStocks].filter((id) => STOCK_IDS.has(id)).length < 4) failures.push('stock-coverage')
  if (eventIds.size !== allEvents.length) failures.push('duplicate-event-id')
  if (allRumors.some((rumor) => !eventIds.has(rumor.targetEventId))) failures.push('orphan-rumor')
  if (allEvents.some((event) => event.causeEventId && !eventIds.has(event.causeEventId))) failures.push('orphan-cause')
  const headlines = allEvents.map((event) => event.headline?.trim()).filter(Boolean)
  if (new Set(headlines).size !== headlines.length) failures.push('duplicate-headline')
  const thin = allEvents.filter((event) => (event.headline?.length || 0) < 8 || (event.detail != null && event.detail.length < 15)).length
  if (thin) failures.push(`thin-prose:${thin}`)

  return { score: Math.max(0, 100 - failures.length * 10), failures, events: allEvents.length, rumors: allRumors.length }
}

function usageOf(completion) {
  const usage = completion.usage || {}
  return {
    input: usage.prompt_tokens || 0,
    cached: usage.prompt_tokens_details?.cached_tokens || 0,
    output: usage.completion_tokens || 0,
    reasoning: usage.completion_tokens_details?.reasoning_tokens || 0,
  }
}

function costOf(variant, usage) {
  const uncached = Math.max(0, usage.input - usage.cached)
  return (uncached * variant.input + usage.cached * variant.cached + usage.output * variant.output) / 1e6
}

async function generate(client, variant, prompt) {
  const started = performance.now()
  const completion = await client.chat.completions.create({
    model: variant.model,
    reasoning_effort: variant.effort,
    messages: [
      { role: 'system', content: CYCLE_SCENARIO_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'cycle_scenario', schema: CYCLE_SCENARIO_SCHEMA, strict: true } },
    prompt_cache_key: 'usd-weekly-benchmark-v1',
  })
  const elapsed = (performance.now() - started) / 1000
  const value = JSON.parse(completion.choices[0].message.content)
  const usage = usageOf(completion)
  return { elapsed, usage, cost: costOf(variant, usage), quality: scoreScenario(value), sample: value }
}

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

async function main() {
  const pool = createRunPlanPoolRepository({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
  const runPlan = await pool.pickRandom()
  if (!runPlan) throw new Error('run_plan_pool이 비어 있습니다.')
  const prompt = buildCycleScenarioUserPrompt({ cycle: CYCLE, runPlan, worldState: null })
  const client = getOpenAIClient()
  const report = { cycle: CYCLE, runPlanTheme: runPlan.theme, promptCharacters: prompt.length, variants: [] }

  for (const variant of VARIANTS) {
    const runs = []
    for (let index = 0; index < REPEATS; index += 1) {
      const result = await generate(client, variant, prompt)
      runs.push(result)
      console.log(`${variant.name} ${index + 1}/${REPEATS}: ${result.elapsed.toFixed(1)}s $${result.cost.toFixed(4)} score=${result.quality.score} cached=${result.usage.cached} reasoning=${result.usage.reasoning}`)
    }
    report.variants.push({
      ...variant,
      averages: {
        seconds: average(runs.map((run) => run.elapsed)),
        cost: average(runs.map((run) => run.cost)),
        score: average(runs.map((run) => run.quality.score)),
        inputTokens: average(runs.map((run) => run.usage.input)),
        cachedTokens: average(runs.map((run) => run.usage.cached)),
        outputTokens: average(runs.map((run) => run.usage.output)),
        reasoningTokens: average(runs.map((run) => run.usage.reasoning)),
      },
      runs: runs.map(({ elapsed, usage, cost, quality }) => ({ elapsed, usage, cost, quality })),
    })
  }
  console.log('\n' + JSON.stringify(report, null, 2))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
