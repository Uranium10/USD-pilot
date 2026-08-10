import { createClient } from '@libsql/client'

// 미리 생성해둔 RunPlan 풀 저장소. ai_market_state(세션별 상태)와 달리 device_id가
// 없다 — 여러 세션이 같은 풀을 공유해서 무작위로 뽑아 쓴다. 배경: 새 게임 시작 시
// RunPlan 생성(claude-opus-5 high, 수십 초)을 기다리지 않게 하기 위함.
// USD-spec/agent_workthrough_3.md 참고.
export function createRunPlanPoolRepository({ url, authToken }) {
  if (!url) throw new Error('TURSO_DATABASE_URL is not configured')
  const client = createClient({ url, authToken })

  return {
    // 풀에서 무작위로 하나 뽑는다. 뽑은 뒤에도 풀에서 지우지 않는다(재사용 허용) —
    // 동시 플레이어가 적은 해커톤 규모에서는 "가끔 같은 RunPlan을 두 세션이 나눠 쓰는
    // 것"보다 "풀이 금방 바닥나는 것"이 더 나쁘다고 판단했다.
    async pickRandom() {
      const result = await client.execute('SELECT run_plan_json FROM run_plan_pool ORDER BY RANDOM() LIMIT 1')
      const row = result.rows[0]
      if (!row) return null
      try { return JSON.parse(String(row.run_plan_json)) }
      catch { return null }
    },

    async count() {
      const result = await client.execute('SELECT COUNT(*) as n FROM run_plan_pool')
      return Number(result.rows[0]?.n ?? 0)
    },

    async insertMany(runPlans) {
      const now = Date.now()
      const statements = runPlans.map((runPlan) => ({
        sql: 'INSERT INTO run_plan_pool (run_plan_json, created_at) VALUES (?, ?)',
        args: [JSON.stringify(runPlan), now],
      }))
      if (statements.length) await client.batch(statements, 'write')
      return { ok: true, inserted: statements.length }
    },
  }
}
