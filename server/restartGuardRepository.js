import { createClient } from '@libsql/client'
import { nextRestartWindow, restartProtectionDecision } from './restartProtection.js'

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9-]{8,80}$/
const assertDeviceId = (deviceId) => {
  if (!DEVICE_ID_PATTERN.test(String(deviceId || ''))) throw new Error('invalid device id')
  return String(deviceId)
}
const parseJson = (value) => {
  try { return value ? JSON.parse(String(value)) : null }
  catch { return null }
}

export function createRestartGuardRepository({ url, authToken }) {
  if (!url) throw new Error('TURSO_DATABASE_URL is not configured')
  const client = createClient({ url, authToken })

  return {
    async get(deviceId) {
      const id = assertDeviceId(deviceId)
      const result = await client.execute({
        sql: `SELECT market_json, run_plan_json, world_state_json, cached_at,
                     window_started_at, fresh_count
              FROM ai_restart_guard WHERE device_id = ? LIMIT 1`,
        args: [id],
      })
      const row = result.rows[0]
      if (!row) return null
      return {
        market: parseJson(row.market_json), runPlan: parseJson(row.run_plan_json),
        worldState: parseJson(row.world_state_json), cachedAt: Number(row.cached_at),
        windowStartedAt: Number(row.window_started_at), freshCount: Number(row.fresh_count),
      }
    },

    async reusable(deviceId, now = Date.now()) {
      const cache = await this.get(deviceId)
      return { cache, ...restartProtectionDecision(cache, now) }
    },

    async saveFresh(deviceId, { market, runPlan, worldState }, now = Date.now()) {
      const id = assertDeviceId(deviceId)
      const previous = await this.get(id)
      const window = nextRestartWindow(previous, now)
      await client.execute({
        sql: `INSERT INTO ai_restart_guard (
                device_id, market_json, run_plan_json, world_state_json,
                cached_at, window_started_at, fresh_count
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(device_id) DO UPDATE SET
                market_json=excluded.market_json, run_plan_json=excluded.run_plan_json,
                world_state_json=excluded.world_state_json, cached_at=excluded.cached_at,
                window_started_at=excluded.window_started_at, fresh_count=excluded.fresh_count`,
        args: [id, JSON.stringify(market), JSON.stringify(runPlan), JSON.stringify(worldState),
          now, window.windowStartedAt, window.freshCount],
      })
      return window
    },

    async remove(deviceId) {
      const id = assertDeviceId(deviceId)
      await client.execute({ sql: 'DELETE FROM ai_restart_guard WHERE device_id = ?', args: [id] })
      return { ok: true }
    },
  }
}
