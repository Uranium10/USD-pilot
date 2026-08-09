import { createClient } from '@libsql/client'

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9-]{8,80}$/

const assertDeviceId = (deviceId) => {
  if (!DEVICE_ID_PATTERN.test(String(deviceId || ''))) throw new Error('invalid device id')
  return String(deviceId)
}

const parseJson = (value) => {
  if (!value) return null
  try { return JSON.parse(String(value)) }
  catch { return null }
}

// AI 시장 생성(RunPlan/CycleScenario) 상태를 device_id별로 저장한다.
// server/ai/aiMarketCycle.js가 이 저장소를 통해 "런당 RunPlan 1회"를 서버리스
// 콜드 스타트/여러 인스턴스에 걸쳐서도 지킨다 — 자세한 배경은
// USD-spec/agent_workthrough_2.md 참고.
export function createAiStateRepository({ url, authToken }) {
  if (!url) throw new Error('TURSO_DATABASE_URL is not configured')
  const client = createClient({ url, authToken })

  return {
    async get(deviceId) {
      const id = assertDeviceId(deviceId)
      const result = await client.execute({
        sql: 'SELECT run_plan_json, world_state_json FROM ai_market_state WHERE device_id = ? LIMIT 1',
        args: [id],
      })
      const row = result.rows[0]
      if (!row) return null
      return {
        runPlan: parseJson(row.run_plan_json),
        worldState: parseJson(row.world_state_json),
      }
    },

    async save(deviceId, { runPlan, worldState }) {
      const id = assertDeviceId(deviceId)
      const now = Date.now()
      await client.execute({
        sql: `INSERT INTO ai_market_state (device_id, run_plan_json, world_state_json, updated_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(device_id) DO UPDATE SET
                run_plan_json=excluded.run_plan_json,
                world_state_json=excluded.world_state_json,
                updated_at=excluded.updated_at`,
        args: [
          id,
          runPlan === undefined ? null : JSON.stringify(runPlan),
          worldState === undefined ? null : JSON.stringify(worldState),
          now,
        ],
      })
      return { ok: true, updatedAt: now }
    },

    async remove(deviceId) {
      const id = assertDeviceId(deviceId)
      await client.execute({ sql: 'DELETE FROM ai_market_state WHERE device_id = ?', args: [id] })
      return { ok: true }
    },
  }
}
