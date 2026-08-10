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

    // --- 사이클별 입력 worldState (2026-08-10) ---
    // save()의 world_state_json은 "가장 최근에 생성된 사이클의 출력"이라 단일 슬롯이다.
    // 프리페치가 주 시작으로 앞당겨지면 그 슬롯만으로는 사이클 N의 입력을 복원할 수
    // 없으므로, 아래 두 함수가 (device_id, cycle) 단위로 입력값을 따로 보존한다.

    async getCycleWorldState(deviceId, cycle) {
      const id = assertDeviceId(deviceId)
      const result = await client.execute({
        sql: 'SELECT world_state_json FROM ai_cycle_world_state WHERE device_id = ? AND cycle = ? LIMIT 1',
        args: [id, Number(cycle)],
      })
      const row = result.rows[0]
      // 행 자체가 없는 것("아직 기록 안 됨")과 NULL이 저장된 것("1주차 — 입력 없음")은
      // 의미가 다르다. 호출부가 레거시 폴백 여부를 판단할 수 있게 구분해서 돌려준다.
      if (!row) return { recorded: false, worldState: null }
      return { recorded: true, worldState: parseJson(row.world_state_json) }
    },

    async saveCycleWorldState(deviceId, cycle, worldState) {
      const id = assertDeviceId(deviceId)
      const now = Date.now()
      await client.execute({
        sql: `INSERT INTO ai_cycle_world_state (device_id, cycle, world_state_json, updated_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(device_id, cycle) DO UPDATE SET
                world_state_json=excluded.world_state_json,
                updated_at=excluded.updated_at`,
        args: [id, Number(cycle), worldState == null ? null : JSON.stringify(worldState), now],
      })
      return { ok: true, updatedAt: now }
    },

    // --- 사이클별 AI 시나리오 캐시 (2026-08-10, 프리페치용) ---
    // 저장되는 건 GPT가 만든 시나리오뿐이고, 가격 경로(결정론적 시장)는 플레이어가
    // 실제로 그 주차에 도달할 때 그 시점의 코인 종가로 새로 만든다.

    async getCycleScenario(deviceId, cycle) {
      const id = assertDeviceId(deviceId)
      const result = await client.execute({
        sql: 'SELECT scenario_json FROM ai_cycle_scenario WHERE device_id = ? AND cycle = ? LIMIT 1',
        args: [id, Number(cycle)],
      })
      return parseJson(result.rows[0]?.scenario_json)
    },

    async saveCycleScenario(deviceId, cycle, scenario) {
      const id = assertDeviceId(deviceId)
      const now = Date.now()
      await client.execute({
        sql: `INSERT INTO ai_cycle_scenario (device_id, cycle, scenario_json, created_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(device_id, cycle) DO UPDATE SET
                scenario_json=excluded.scenario_json,
                created_at=excluded.created_at`,
        args: [id, Number(cycle), JSON.stringify(scenario), now],
      })
      return { ok: true, createdAt: now }
    },

    async remove(deviceId) {
      const id = assertDeviceId(deviceId)
      await client.execute({ sql: 'DELETE FROM ai_market_state WHERE device_id = ?', args: [id] })
      await client.execute({ sql: 'DELETE FROM ai_cycle_world_state WHERE device_id = ?', args: [id] })
      await client.execute({ sql: 'DELETE FROM ai_cycle_scenario WHERE device_id = ?', args: [id] })
      return { ok: true }
    },
  }
}
