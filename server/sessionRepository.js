import { createClient } from '@libsql/client'

const ACTIVE_STATUS = new Set(['active', 'gameover', 'clear'])
const DEVICE_ID_PATTERN = /^[a-zA-Z0-9-]{8,80}$/

const assertDeviceId = (deviceId) => {
  if (!DEVICE_ID_PATTERN.test(String(deviceId || ''))) throw new Error('invalid device id')
  return String(deviceId)
}

const parseWorldState = (value) => {
  if (!value) return {}
  try { return JSON.parse(String(value)) }
  catch { return {} }
}

const mapSession = (row, holdingRows = []) => ({
  deviceId: String(row.device_id),
  status: String(row.status),
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at),
  screen: String(row.screen),
  phase: String(row.phase),
  cycle: Number(row.cycle),
  day: Number(row.day),
  marketSeed: Number(row.market_seed),
  elapsed: Number(row.elapsed),
  cash: Number(row.cash),
  debt: Number(row.debt),
  selectedStockId: row.selected_stock_id ? String(row.selected_stock_id) : null,
  selectedRumorId: row.selected_rumor_id ? String(row.selected_rumor_id) : null,
  worldState: parseWorldState(row.world_state_json),
  holdings: Object.fromEntries(holdingRows.map((holding) => [String(holding.stock_id), {
    quantity: Number(holding.quantity),
    average: Number(holding.average),
  }])),
})

export function createSessionRepository({ url, authToken }) {
  if (!url) throw new Error('TURSO_DATABASE_URL is not configured')
  const client = createClient({ url, authToken })

  return {
    async get(deviceId) {
      const id = assertDeviceId(deviceId)
      const [sessionResult, holdingsResult] = await client.batch([
        { sql: 'SELECT * FROM sessions WHERE device_id = ? LIMIT 1', args: [id] },
        { sql: 'SELECT stock_id, quantity, average FROM holdings WHERE device_id = ?', args: [id] },
      ], 'read')
      const row = sessionResult.rows[0]
      return row ? mapSession(row, holdingsResult.rows) : null
    },

    async save(payload) {
      const deviceId = assertDeviceId(payload.deviceId)
      const status = ACTIVE_STATUS.has(payload.status) ? payload.status : 'active'
      const revision = Number(payload.updatedAt)
      const cycle = Number(payload.cycle)
      const day = Number(payload.day)
      if (!Number.isSafeInteger(revision) || revision <= 0) throw new Error('invalid save revision')
      if (!Number.isInteger(cycle) || cycle < 1 || cycle > 7) throw new Error('invalid cycle')
      if (!Number.isInteger(day) || day < 1 || day > 7) throw new Error('invalid day')
      const holdings = Object.entries(payload.holdings || {}).filter(([, holding]) => (
        Number.isFinite(Number(holding?.quantity)) && Number(holding.quantity) > 0
      ))
      const statements = [{
        sql: `INSERT INTO sessions (
          device_id, status, created_at, updated_at, screen, phase, cycle, day,
          market_seed, elapsed, cash, debt, selected_stock_id, selected_rumor_id, world_state_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(device_id) DO UPDATE SET
          status=excluded.status, updated_at=excluded.updated_at, screen=excluded.screen,
          phase=excluded.phase, cycle=excluded.cycle, day=excluded.day,
          market_seed=excluded.market_seed, elapsed=excluded.elapsed, cash=excluded.cash,
          debt=excluded.debt, selected_stock_id=excluded.selected_stock_id,
          selected_rumor_id=excluded.selected_rumor_id, world_state_json=excluded.world_state_json
        WHERE excluded.updated_at >= sessions.updated_at`,
        args: [
          deviceId, status, revision, revision, payload.screen, payload.phase,
          cycle, day, payload.marketSeed, payload.elapsed,
          payload.cash, payload.debt, payload.selectedStockId || null,
          payload.selectedRumorId || null, JSON.stringify(payload.worldState || {}),
        ],
      }, {
        sql: 'DELETE FROM holdings WHERE device_id = ? AND EXISTS (SELECT 1 FROM sessions WHERE device_id = ? AND updated_at = ?)',
        args: [deviceId, deviceId, revision],
      }]
      holdings.forEach(([stockId, holding]) => statements.push({
        sql: 'INSERT INTO holdings (device_id, stock_id, quantity, average) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM sessions WHERE device_id = ? AND updated_at = ?)',
        args: [deviceId, stockId, Number(holding.quantity), Number(holding.average) || 0, deviceId, revision],
      }))
      await client.batch(statements, 'write')
      const saved = await this.get(deviceId)
      return { ok: saved?.updatedAt === revision && saved?.cycle === cycle && saved?.day === day, updatedAt: saved?.updatedAt, cycle: saved?.cycle, day: saved?.day }
    },

    async remove(deviceId) {
      const id = assertDeviceId(deviceId)
      await client.execute({ sql: 'DELETE FROM sessions WHERE device_id = ?', args: [id] })
      return { ok: true }
    },
  }
}
