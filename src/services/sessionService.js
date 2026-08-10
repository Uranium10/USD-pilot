const DEVICE_KEY = 'usd-device-id'
const SESSION_KEY = 'usd-session-backup'
let lastSaveRevision = 0

export const getDeviceId = () => {
  let deviceId = window.localStorage.getItem(DEVICE_KEY)
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`
    window.localStorage.setItem(DEVICE_KEY, deviceId)
  }
  return deviceId
}

const localSession = () => {
  try { return JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null') }
  catch { return null }
}

export function sessionPayload(state) {
  const purchasedRumorIds = state.purchasedRumors.map((rumor) => rumor.id)
  return {
    deviceId: getDeviceId(),
    status: state.phase === 'gameover' ? 'gameover' : state.phase === 'ended' ? 'clear' : 'active',
    screen: state.screen,
    phase: state.phase,
    cycle: state.cycle,
    day: state.day,
    marketSeed: state.market.seed,
    elapsed: state.elapsed,
    cash: state.cash,
    debt: state.debt,
    selectedStockId: state.selectedStockId,
    selectedRumorId: purchasedRumorIds[0] || null,
    holdings: state.holdings,
    worldState: {
      market: state.market,
      companyIds: state.market.companyIds,
      companyIdsPinned: state.market.companyIdsPinned,
      coinStartPrice: state.market.coinStartPrice,
      // world.market이 유실됐을 때(구버전 저장분 등)의 fetchMarketCycle() 폴백 경로용 —
      // 코인과 동일한 목적으로 사이클 경계 가격 리셋을 막는다(App.jsx 참고).
      companyStartPrices: [1, 2, 3, 4, 5].map((n) => state.currentPrices?.[`stock-${n}`]),
      sisyphusStartPrice: state.currentPrices?.['stock-sisyphus'],
      purchasedRumorIds,
      purchasedRumors: state.purchasedRumors,
      notepadContent: state.notepadContent,
      notepadFontSize: state.notepadFontSize,
      dailySummaries: state.dailySummaries,
      dayStartNetWorth: state.dayStartNetWorth,
      energy: state.energy,
      inventory: state.inventory,
      dailyDrinkPurchased: state.dailyDrinkPurchased,
      completedNightActivityIds: state.completedNightActivityIds,
      donationSchedule: state.donationSchedule,
      donationCount: state.donationCount,
      miningTier: state.miningTier,
      hackingDeckLevel: state.hackingDeckLevel,
      minedCoinToday: state.minedCoinToday,
      totalMinedCoin: state.totalMinedCoin,
      showMonitorHint: state.showMonitorHint,
      playedSceneIds: state.playedSceneIds,
      storyFlags: state.storyFlags,
      nightTutorialSeen: state.nightTutorialSeen,
      epilogue: state.epilogue,
      endingType: state.endingType,
      hasSmugglingTicket: state.hasSmugglingTicket,
      weeklyModifierId: state.weeklyModifierId,
      weeklyModifierHistory: state.weeklyModifierHistory,
    },
    updatedAt: (lastSaveRevision = Math.max(Date.now(), lastSaveRevision + 1)),
  }
}

export async function getSavedSession() {
  const deviceId = getDeviceId()
  try {
    const response = await fetch(`/api/session?deviceId=${encodeURIComponent(deviceId)}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`session api: ${response.status}`)
    const { session } = await response.json()
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session || localSession()
  } catch (error) {
    console.warn('서버 저장을 불러올 수 없어 브라우저 백업을 사용합니다.', error)
    return localSession()
  }
}

export async function saveSession(state) {
  if (!state.market) return false
  const payload = sessionPayload(state)
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload))
  try {
    const response = await fetch('/api/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`session api: ${response.status}`)
    const result = await response.json()
    if (!result?.ok || Number(result.updatedAt) !== payload.updatedAt || Number(result.cycle) !== payload.cycle || Number(result.day) !== payload.day) {
      throw new Error(`session ack mismatch: ${result?.cycle}/${result?.day}`)
    }
    return true
  } catch (error) {
    console.warn('서버 저장에 실패해 브라우저 백업만 갱신했습니다.', error)
    return false
  }
}

export async function clearSavedSession() {
  const deviceId = getDeviceId()
  window.localStorage.removeItem(SESSION_KEY)
  try {
    await fetch(`/api/session?deviceId=${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
  } catch (error) {
    console.warn('이전 서버 저장 삭제를 건너뜁니다.', error)
  }
}
