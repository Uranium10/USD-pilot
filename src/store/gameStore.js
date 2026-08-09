import { create } from 'zustand'
import { COIN_ASSET_ID, DAY_DURATION_SECONDS, DAYS_PER_CYCLE, INITIAL_DEBT, JOB_ENERGY_COST, JOB_REWARD, MAX_ENERGY, SISYPHUS_MAJORITY_SHARES, SISYPHUS_MAX_SHARES, SISYPHUS_STOCK_ID } from '../config.js'
import { buyExecutionPrice, isCoinAsset, normalizeTradeQuantity, sellExecutionPrice } from '../logic/coinSystem.js'
import { computeSettlement } from '../logic/debtSystem.js'
import { canUpgradeMine, mineRate, mineUpgradeCost } from '../logic/miningSystem.js'
import { findMatchingScene } from '../logic/storyTriggers.js'

const initialGame = {
  screen: 'title',
  phase: 'idle',
  cycle: 1,
  day: 1,
  cash: 12000,
  debt: INITIAL_DEBT,
  holdings: {},
  market: null,
  selectedStockId: null,
  purchasedRumors: [],
  notepadContent: '',
  notepadFontSize: 16,
  dailySummaries: [],
  dayStartNetWorth: 12000,
  elapsed: 0,
  currentPrices: {},
  visibleNews: [],
  paused: false,
  overlay: null,
  feedback: null,
  energy: MAX_ENERGY,
  inventory: {},
  nightActivity: null,
  nightMessage: null,
  dailyDrinkPurchased: 0,
  miningTier: -1,
  minedCoinToday: 0,
  totalMinedCoin: 0,
  dayIntroDestination: 'room',
  showMonitorHint: false,
  marketReady: false,
  // 대화 스토리 엔진 (2026-08-10 도입)
  activeScene: null,
  playedSceneIds: [],
  // 4분기 엔딩 시스템
  epilogue: false, // 6주차 청산 성공 후 7일째(에필로그) 유예 기간인지
  endingType: null, // 'normal' | 'hidden' | 'true' — phase가 'ended'일 때만 의미 있음
  hasSmugglingTicket: false,
}

function interpolate(path, progress) {
  const rightIndex = path.findIndex((point) => point.progress >= progress)
  if (rightIndex <= 0) return path[0].price
  const left = path[rightIndex - 1]
  const right = path[rightIndex]
  const ratio = (progress - left.progress) / (right.progress - left.progress)
  return Math.round((left.price + (right.price - left.price) * ratio) * 100) / 100
}

const dayData = (state) => state.market?.days[state.day - 1]

const pricesAtProgress = (stocks, progress) => Object.fromEntries(
  stocks.map((stock) => [stock.id, interpolate(stock.path, progress)]),
)

const calculateNetWorth = (state) => Object.entries(state.holdings).reduce(
  (total, [stockId, holding]) => total + (state.currentPrices[stockId] || holding.average) * holding.quantity,
  state.cash,
)

export const useGameStore = create((set, get) => ({
  ...initialGame,
  setScreen: (screen) => set({ screen }),
  setNotepadContent: (notepadContent) => set({ notepadContent }),
  setNotepadFontSize: (size) => set({ notepadFontSize: Math.min(28, Math.max(12, size)) }),
  beginLoading: () => set({ ...initialGame, screen: 'room', phase: 'dayIntro', marketReady: false }),
  loadMarket: (market) => {
    const firstDay = market.days[0]
    set({
      market,
      phase: 'dayIntro',
      screen: 'room',
      dayIntroDestination: 'room',
      showMonitorHint: true,
      marketReady: true,
      selectedStockId: firstDay.stocks[0].id,
      currentPrices: Object.fromEntries(firstDay.stocks.map((stock) => [stock.id, stock.startPrice])),
    })
  },
  completeDayIntro: () => {
    const state = get()
    if (!['dayIntro', 'epilogueIntro'].includes(state.phase) || !state.marketReady) return
    set({ phase: 'premarket', screen: state.dayIntroDestination, dayIntroDestination: 'monitor' })
    get().checkStoryTriggers()
  },
  openMonitor: () => set({ screen: 'monitor', showMonitorHint: false }),
  restoreSession: (session, market) => {
    const world = session.worldState || {}
    const cycle = Math.min(6, Math.max(1, Number(session.cycle) || 1))
    const day = Math.min(DAYS_PER_CYCLE, Math.max(1, Number(session.day) || 1))
    const data = market.days[day - 1]
    const elapsed = Math.min(DAY_DURATION_SECONDS, Math.max(0, Number(session.elapsed) || 0))
    const progress = elapsed / DAY_DURATION_SECONDS
    const progressed = ['day', 'dayReport', 'night', 'settlement'].includes(session.phase)
    const purchasedIds = new Set(world.purchasedRumorIds || (session.selectedRumorId ? [session.selectedRumorId] : []))
    const phase = ['premarket', 'day', 'dayReport', 'night', 'settlement', 'epilogueIntro'].includes(session.phase) ? session.phase : 'premarket'
    const screen = phase === 'night' || phase === 'settlement'
      ? 'room'
      : session.screen === 'room' ? 'room' : 'monitor'
    set({
      ...initialGame,
      screen,
      phase,
      cycle,
      day,
      cash: Number(session.cash) || 0,
      debt: Number(session.debt) || 0,
      holdings: session.holdings || {},
      market,
      selectedStockId: data.stocks.some((stock) => stock.id === session.selectedStockId) ? session.selectedStockId : data.stocks[0].id,
      purchasedRumors: data.rumors.filter((rumor) => purchasedIds.has(rumor.id)),
      notepadContent: world.notepadContent || '',
      notepadFontSize: Number(world.notepadFontSize) || 16,
      dailySummaries: Array.isArray(world.dailySummaries) ? world.dailySummaries : [],
      dayStartNetWorth: Number(world.dayStartNetWorth) || Number(session.cash) || 0,
      elapsed,
      currentPrices: progressed
        ? pricesAtProgress(data.stocks, progress)
        : Object.fromEntries(data.stocks.map((stock) => [stock.id, stock.startPrice])),
      visibleNews: phase === 'day' || phase === 'dayReport' ? data.news.filter((item) => item.progress <= progress) : [],
      paused: phase === 'dayReport',
      energy: Number.isFinite(Number(world.energy)) ? Number(world.energy) : MAX_ENERGY,
      inventory: world.inventory || {},
      dailyDrinkPurchased: Number(world.dailyDrinkPurchased) || 0,
      miningTier: Number.isFinite(Number(world.miningTier)) ? Number(world.miningTier) : -1,
      minedCoinToday: Number(world.minedCoinToday) || 0,
      totalMinedCoin: Number(world.totalMinedCoin) || 0,
      showMonitorHint: Boolean(world.showMonitorHint),
      dayIntroDestination: 'monitor',
      marketReady: true,
      playedSceneIds: Array.isArray(world.playedSceneIds) ? world.playedSceneIds : [],
      epilogue: Boolean(world.epilogue),
      endingType: world.endingType || null,
      hasSmugglingTicket: Boolean(world.hasSmugglingTicket),
    })
  },
  purchaseRumor: (rumor) => {
    const { cash, purchasedRumors, phase } = get()
    if (phase !== 'premarket' || purchasedRumors.some((item) => item.id === rumor.id) || cash < rumor.cost) return false
    set({
      cash: cash - rumor.cost,
      purchasedRumors: [...purchasedRumors, rumor],
      feedback: { amount: -rumor.cost, id: Date.now() },
    })
    return true
  },
  purchaseRumors: (rumors) => {
    const { cash, purchasedRumors, phase } = get()
    if (phase !== 'premarket') return false
    const purchasedIds = new Set(purchasedRumors.map((item) => item.id))
    const uniqueRumors = rumors.filter((rumor, index, items) => !purchasedIds.has(rumor.id) && items.findIndex((item) => item.id === rumor.id) === index)
    const totalCost = uniqueRumors.reduce((total, rumor) => total + rumor.cost, 0)
    if (uniqueRumors.length === 0 || totalCost > cash) return false
    set({
      cash: cash - totalCost,
      purchasedRumors: [...purchasedRumors, ...uniqueRumors],
      feedback: { amount: -totalCost, id: Date.now() },
    })
    return uniqueRumors
  },
  startDay: () => {
    const state = get()
    const data = dayData(state)
    if (!data || state.phase !== 'premarket') return
    set({
      phase: 'day',
      screen: 'monitor',
      elapsed: 0,
      visibleNews: [],
      overlay: null,
      paused: false,
      dayStartNetWorth: calculateNetWorth(state),
      minedCoinToday: 0,
      currentPrices: Object.fromEntries(data.stocks.map((stock) => [stock.id, stock.startPrice])),
    })
  },
  engineTick: (deltaSeconds) => {
    const state = get()
    if (state.phase !== 'day' || state.paused) return
    const elapsed = Math.min(DAY_DURATION_SECONDS, state.elapsed + deltaSeconds)
    const activeSeconds = elapsed - state.elapsed
    const minedCoin = mineRate(state.miningTier) * activeSeconds
    const progress = elapsed / DAY_DURATION_SECONDS
    const data = dayData(state)
    const currentPrices = Object.fromEntries(data.stocks.map((stock) => [stock.id, interpolate(stock.path, progress)]))
    const nextVisibleNews = data.news.filter((item) => item.progress <= progress)
    const visibleNews = nextVisibleNews.length === state.visibleNews.length
      && nextVisibleNews.every((item, index) => item.id === state.visibleNews[index]?.id)
      ? state.visibleNews
      : nextVisibleNews
    let holdings = state.holdings
    if (minedCoin > 0) {
      const previous = holdings[COIN_ASSET_ID] || { quantity: 0, average: 0 }
      const quantity = previous.quantity + minedCoin
      holdings = {
        ...holdings,
        [COIN_ASSET_ID]: {
          quantity,
          average: quantity > 0 ? previous.average * previous.quantity / quantity : 0,
        },
      }
    }
    set({
      elapsed,
      currentPrices,
      visibleNews,
      holdings,
      minedCoinToday: state.minedCoinToday + minedCoin,
      totalMinedCoin: state.totalMinedCoin + minedCoin,
    })
    if (elapsed >= DAY_DURATION_SECONDS) get().finishDay()
  },
  finishDay: () => {
    const state = get()
    const netWorth = calculateNetWorth(state)
    const summary = { cycle: state.cycle, day: state.day, netWorth, cash: state.cash, change: netWorth - state.dayStartNetWorth }
    set({
      phase: 'dayReport',
      screen: 'monitor',
      paused: true,
      overlay: null,
      dailySummaries: [...state.dailySummaries.filter((item) => item.cycle !== state.cycle || item.day !== state.day), summary],
    })
    get().checkStoryTriggers()
  },
  enterNight: () => {
    if (get().phase !== 'dayReport') return
    set({ phase: 'night', screen: 'room', paused: false, nightActivity: null, nightMessage: null })
    get().checkStoryTriggers()
  },
  endNight: () => {
    const state = get()
    if (state.phase !== 'night' || state.nightActivity) return
    // 에필로그(청산 후 유예일)의 밤이 끝나면 정산/다음 날로 넘어가지 않고 바로 결말로
    // 이어진다 — 밀항선 티켓을 샀으면 진 엔딩, 아니면 노멀 엔딩.
    if (state.epilogue) {
      set({ phase: 'ended', endingType: state.hasSmugglingTicket ? 'true' : 'normal' })
      return
    }
    if (state.day >= DAYS_PER_CYCLE) {
      set({ phase: 'settlement', energy: MAX_ENERGY, nightMessage: null })
      return
    }
    const nextDay = state.day + 1
    const data = state.market.days[nextDay - 1]
    set({
      day: nextDay,
      phase: 'dayIntro',
      screen: 'room',
      dayIntroDestination: 'monitor',
      showMonitorHint: false,
      marketReady: true,
      purchasedRumors: [],
      elapsed: 0,
      visibleNews: [],
      currentPrices: Object.fromEntries(data.stocks.map((stock) => [stock.id, stock.startPrice])),
      selectedStockId: data.stocks[0].id,
      energy: MAX_ENERGY,
      nightMessage: null,
      dailyDrinkPurchased: 0,
    })
    get().checkStoryTriggers()
  },
  // payAmount: 플레이어가 이번 주기에 실제로 낼 금액(최소 상환액 이상, 초과분은 선상환).
  // 보유 현금을 넘겨 낼 수는 없으므로 여기서 한 번 더 clamp한다.
  settleCycle: (payAmount) => {
    const state = get()
    if (state.phase !== 'settlement') return null
    const amount = Math.min(Math.max(0, Math.round(payAmount)), state.cash, state.debt)
    const result = computeSettlement(state.debt, state.cycle, amount)
    if (result.gameOver) {
      set({ phase: 'gameover' })
      return { result: 'gameover' }
    }
    const cash = state.cash - amount
    if (result.cleared) {
      // 청산 성공 — 곧바로 끝내지 않고 1일짜리 에필로그(유예 기간)로 진입한다. 새 시장을
      // 따로 생성하지 않고 이번 사이클 마지막 날의 시세/뉴스/소문 데이터를 그대로
      // 재사용한다(밸런스·AI 스키마를 사이클 7까지 확장하지 않기 위한 의도적 단순화).
      const epilogueDay = state.market.days[DAYS_PER_CYCLE - 1]
      set({
        cash, debt: 0, phase: 'epilogueIntro', epilogue: true, day: 1, screen: 'room',
        dayIntroDestination: 'monitor', showMonitorHint: false, marketReady: true,
        purchasedRumors: [], elapsed: 0, visibleNews: [], dailyDrinkPurchased: 0, minedCoinToday: 0,
        currentPrices: Object.fromEntries(epilogueDay.stocks.map((stock) => [stock.id, stock.startPrice])),
        selectedStockId: epilogueDay.stocks[0].id,
      })
      return { result: 'epilogue' }
    }
    set({ cash, debt: result.debt, cycle: result.nextCycle, day: 1, phase: 'dayIntro', screen: 'room', marketReady: false })
    get().checkStoryTriggers()
    return { result: 'next', cycle: result.nextCycle }
  },
  loadNextCycle: (market) => {
    const data = market.days[0]
    set({
      cycle: market.cycle,
      day: 1,
      market,
      phase: 'dayIntro',
      screen: 'room',
      dayIntroDestination: 'monitor',
      showMonitorHint: false,
      purchasedRumors: [],
      dailySummaries: [],
      selectedStockId: data.stocks[0].id,
      currentPrices: Object.fromEntries(data.stocks.map((stock) => [stock.id, stock.startPrice])),
      visibleNews: [],
      elapsed: 0,
      dailyDrinkPurchased: 0,
      minedCoinToday: 0,
      marketReady: true,
    })
  },
  selectStock: (selectedStockId) => set({ selectedStockId }),
  buy: (stockId, quantity) => {
    const state = get()
    if (state.phase !== 'day') return
    const asset = dayData(state)?.stocks.find((stock) => stock.id === stockId)
    if (!asset || isCoinAsset(asset)) return
    let amount = normalizeTradeQuantity(asset, quantity)
    // 시지프 인텔리전스는 총 발행 주식이 1000주뿐인 상시 상장 특수 자산이다 — 플레이어가
    // 최대 보유량(1000주)을 넘겨 살 수 없도록 여기서 clamp한다.
    if (stockId === SISYPHUS_STOCK_ID) {
      const owned = state.holdings[stockId]?.quantity || 0
      amount = Math.min(amount, Math.max(0, SISYPHUS_MAX_SHARES - owned))
    }
    const marketPrice = state.currentPrices[stockId]
    const price = buyExecutionPrice(asset, marketPrice)
    const cost = price * amount
    if (!price || amount <= 0 || state.cash < cost) return
    const previous = state.holdings[stockId] || { quantity: 0, average: 0 }
    const nextQuantity = previous.quantity + amount
    const average = (previous.average * previous.quantity + cost) / nextQuantity
    set({
      cash: state.cash - cost,
      holdings: { ...state.holdings, [stockId]: { quantity: nextQuantity, average } },
      feedback: null,
    })
    return { cost }
  },
  sell: (stockId, quantity) => {
    const state = get()
    if (state.phase !== 'day') return
    const asset = dayData(state)?.stocks.find((stock) => stock.id === stockId)
    if (!asset || (isCoinAsset(asset) && state.miningTier < 0)) return
    const owned = state.holdings[stockId]
    const ownedQuantity = owned?.quantity || 0
    const requested = Number(quantity) >= ownedQuantity ? ownedQuantity : normalizeTradeQuantity(asset, quantity)
    const amount = Math.min(requested, ownedQuantity)
    if (amount <= 0) return
    const price = sellExecutionPrice(asset, state.currentPrices[stockId])
    const proceeds = price * amount
    const holdings = { ...state.holdings }
    if (owned.quantity === amount) delete holdings[stockId]
    else holdings[stockId] = { ...owned, quantity: owned.quantity - amount }
    const profit = (price - owned.average) * amount
    set({ cash: state.cash + proceeds, holdings, feedback: { amount: profit, id: Date.now(), kind: 'realized' } })
    return { proceeds, profit }
  },
  buyNightItem: (item) => {
    const state = get()
    if (state.phase !== 'night' || state.nightActivity || state.cash < item.price) return false
    if (item.id === 'chili-energy' && state.dailyDrinkPurchased >= 2) return false
    set({
      cash: state.cash - item.price,
      inventory: { ...state.inventory, [item.id]: (state.inventory[item.id] || 0) + 1 },
      dailyDrinkPurchased: item.id === 'chili-energy' ? state.dailyDrinkPurchased + 1 : state.dailyDrinkPurchased,
    })
    return true
  },
  upgradeMiningMachine: () => {
    const state = get()
    const cost = mineUpgradeCost(state.miningTier)
    if (state.phase !== 'night' || state.nightActivity || state.cash < cost || !canUpgradeMine(state.miningTier, state.cycle)) return false
    set({ cash: state.cash - cost, miningTier: state.miningTier + 1 })
    return true
  },
  useNightItem: (item) => {
    const state = get()
    const quantity = state.inventory[item.id] || 0
    if (state.phase !== 'night' || state.nightActivity || quantity <= 0) return false
    const inventory = { ...state.inventory, [item.id]: quantity - 1 }
    if (inventory[item.id] <= 0) delete inventory[item.id]
    set({ inventory, energy: Math.min(MAX_ENERGY, state.energy + item.energyRestore), nightMessage: '적응이 안되는 맛이다...' })
    return true
  },
  startNightJob: () => {
    const state = get()
    if (state.phase !== 'night' || state.nightActivity || state.energy < JOB_ENERGY_COST) return false
    set({ nightActivity: { id: 'convenience-job', startedAt: Date.now() }, nightMessage: null })
    return true
  },
  completeNightJob: () => {
    const state = get()
    if (state.nightActivity?.id !== 'convenience-job') return
    set({
      nightActivity: null,
      energy: Math.max(0, state.energy - JOB_ENERGY_COST),
      cash: state.cash + JOB_REWARD,
      nightMessage: `편의점 아르바이트를 마쳤다. +₡${JOB_REWARD}`,
    })
  },
  clearNightMessage: () => set({ nightMessage: null }),
  showOverlay: (overlay) => set({ overlay, paused: true }),
  closeOverlay: () => set({ overlay: null, paused: false }),
  // day/cycle/phase 전환 지점들 끝에서 호출된다 — 조건에 맞는 미재생 장면이 있으면
  // activeScene에 채운다. paused:true로 겹쳐 day 타이머 등을 멈춘다(closeOverlay와
  // 동일한 패턴).
  checkStoryTriggers: () => {
    const state = get()
    if (state.activeScene) return
    const match = findMatchingScene(state, state.playedSceneIds)
    if (match) set({ activeScene: match, paused: true })
  },
  closeScene: () => {
    const state = get()
    if (!state.activeScene) return
    set({ activeScene: null, paused: false, playedSceneIds: [...state.playedSceneIds, state.activeScene.id] })
  },
  triggerHiddenEnding: () => set({ phase: 'ended', endingType: 'hidden' }),
  buySmugglingTicket: (item) => {
    const state = get()
    if (!state.epilogue || state.phase !== 'night' || state.nightActivity || state.cash < item.price) return false
    set({ cash: state.cash - item.price, hasSmugglingTicket: true, phase: 'ended', endingType: 'true' })
    return true
  },
  restart: () => set({ ...initialGame }),
}))

export function getNetWorth(state) {
  return calculateNetWorth(state)
}

// 히든 엔딩(적대적 M&A) 자격 — 시지프 인텔리전스 주식을 51%(510주) 이상 보유했는가.
export function isHiddenEndingEligible(state) {
  return (state.holdings[SISYPHUS_STOCK_ID]?.quantity || 0) >= SISYPHUS_MAJORITY_SHARES
}
