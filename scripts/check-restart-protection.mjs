#!/usr/bin/env node
import { createRestartGuardRepository } from '../server/restartGuardRepository.js'

const repository = createRestartGuardRepository({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const deviceId = `restart-test-${Date.now()}`
const now = Date.now()
try {
  await repository.saveFresh(deviceId, {
    market: { cycle: 1, seed: 101 },
    runPlan: { theme: 'restart guard test' },
    worldState: { tensions: ['test'] },
  }, now)
  const protectedRestart = await repository.reusable(deviceId, now + 1000)
  if (!protectedRestart.reuse || protectedRestart.reason !== 'cooldown') throw new Error('cooldown cache miss')
  if (protectedRestart.cache.market.seed !== 101 || protectedRestart.cache.runPlan.theme !== 'restart guard test') throw new Error('cached package mismatch')
  console.log('재시작 보호 Turso 저장/조회 검증 통과')
} finally {
  await repository.remove(deviceId)
}
