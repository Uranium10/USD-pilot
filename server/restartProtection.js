export const RESTART_REUSE_MS = 30 * 60 * 1000
export const RESTART_WINDOW_MS = 24 * 60 * 60 * 1000
export const MAX_FRESH_CYCLE_ONE_PER_WINDOW = 3

export function restartProtectionDecision(cache, now = Date.now()) {
  if (!cache?.market || !cache?.runPlan || !cache?.worldState) return { reuse: false, reason: null }
  if (now - cache.cachedAt < RESTART_REUSE_MS) return { reuse: true, reason: 'cooldown' }
  const sameWindow = now - cache.windowStartedAt < RESTART_WINDOW_MS
  if (sameWindow && cache.freshCount >= MAX_FRESH_CYCLE_ONE_PER_WINDOW) return { reuse: true, reason: 'daily-limit' }
  return { reuse: false, reason: null }
}

export function nextRestartWindow(cache, now = Date.now()) {
  const sameWindow = cache && now - cache.windowStartedAt < RESTART_WINDOW_MS
  return {
    windowStartedAt: sameWindow ? cache.windowStartedAt : now,
    freshCount: sameWindow ? cache.freshCount + 1 : 1,
  }
}
