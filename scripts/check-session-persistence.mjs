import { createClient } from '@libsql/client'
import { createSessionRepository } from '../server/sessionRepository.js'
import sessionHandler from '../api/session.js'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url || !authToken) throw new Error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const client = createClient({ url, authToken })
const repository = createSessionRepository({ url, authToken })
const deviceId = `save-check-${Date.now()}`
const firstRevision = Date.now()
const base = {
  deviceId,
  status: 'active',
  screen: 'monitor',
  phase: 'day',
  marketSeed: 777,
  elapsed: 123.5,
  cash: 54321,
  debt: 123456,
  selectedStockId: 'stock-2',
  selectedRumorId: null,
  holdings: { 'stock-2': { quantity: 7, average: 111 } },
  worldState: { persistenceCheck: true },
  updatedAt: firstRevision,
}

async function callSessionApi(method, { body, query } = {}) {
  let statusCode = 200
  let payload
  const response = {
    setHeader() {},
    status(code) { statusCode = code; return this },
    json(value) { payload = value; return value },
  }
  await sessionHandler({ method, body, query }, response)
  return { statusCode, payload }
}

try {
  const columns = await client.execute("PRAGMA table_info('sessions')")
  const names = new Set(columns.rows.map((row) => String(row.name)))
  for (const required of ['device_id', 'phase', 'cycle', 'day', 'updated_at']) {
    assert(names.has(required), `sessions.${required} 컬럼이 없습니다.`)
  }

  const firstWrite = await callSessionApi('PUT', { body: { ...base, cycle: 4, day: 6 } })
  assert(firstWrite.statusCode === 200 && firstWrite.payload?.ok, 'PUT /api/session 첫 저장이 실패했습니다.')
  const firstRead = await callSessionApi('GET', { query: { deviceId } })
  const first = firstRead.payload?.session
  assert(first?.cycle === 4 && first?.day === 6, `첫 저장 왕복 실패: ${first?.cycle}/${first?.day}`)

  const secondWrite = await callSessionApi('PUT', {
    body: {
      ...base,
      phase: 'night',
      cycle: 5,
      day: 3,
      elapsed: 480,
      updatedAt: firstRevision + 1,
      holdings: { 'stock-2': { quantity: 9, average: 112 } },
    },
  })
  assert(secondWrite.statusCode === 200 && secondWrite.payload?.ok, 'PUT /api/session 갱신이 실패했습니다.')
  const second = (await callSessionApi('GET', { query: { deviceId } })).payload?.session
  assert(second?.cycle === 5 && second?.day === 3 && second?.phase === 'night', `갱신 왕복 실패: ${second?.cycle}/${second?.day}/${second?.phase}`)

  const direct = await client.execute({ sql: 'SELECT cycle, day, phase FROM sessions WHERE device_id = ?', args: [deviceId] })
  const row = direct.rows[0]
  assert(Number(row?.cycle) === 5 && Number(row?.day) === 3, 'Turso 원본 행에 최신 cycle/day가 기록되지 않았습니다.')
  const stale = await callSessionApi('PUT', { body: { ...base, cycle: 1, day: 1, updatedAt: firstRevision } })
  assert(stale.statusCode === 200 && stale.payload?.ok === false, '오래된 저장 요청이 성공 처리됐습니다.')
  const afterStale = await repository.get(deviceId)
  assert(afterStale.cycle === 5 && afterStale.day === 3, '오래된 요청이 최신 진행도를 덮어썼습니다.')
  assert(afterStale.holdings['stock-2']?.quantity === 9, '오래된 요청이 최신 보유 종목을 덮어썼습니다.')
  console.log('Turso sessions 저장 왕복 검증 통과: 4주차 6일 → 5주차 3일 갱신 확인')
} finally {
  await repository.remove(deviceId).catch(() => {})
  client.close()
}
