import { create } from 'zustand'
import { DAY_DURATION_SECONDS, DAYS_PER_CYCLE, MAX_CYCLES } from '../config.js'

const initialGame = {
  screen: 'title',
  phase: 'idle',
  cycle: 1,
  day: 1,
  cash: 12000,
  debt: 14000,
  holdings: {},
  market: null,
  selectedStockId: null,
  purchasedRumors: [],
  dailySummaries: [],
  elapsed: 0,
  currentPrices: {},
  visibleNews: [],
  paused: false,
  overlay: null,
  feedback: null,
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

const calculateNetWorth = (state) => Object.entries(state.holdings).reduce(
  (total, [stockId, holding]) => total + (state.currentPrices[stockId] || holding.average) * holding.quantity,
  state.cash,
)

export const useGameStore = create((set, get) => ({
  ...initialGame,
  setScreen: (screen) => set({ screen }),
  beginLoading: () => set({ ...initialGame, screen: 'room', phase: 'loading' }),
  loadMarket: (market) => {
    const firstDay = market.days[0]
    set({
      market,
      debt: market.repayment,
      phase: 'premarket',
      selectedStockId: firstDay.stocks[0].id,
      currentPrices: Object.fromEntries(firstDay.stocks.map((stock) => [stock.id, stock.startPrice])),
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
  startDay: () => {
    const data = dayData(get())
    if (!data || get().phase !== 'premarket') return
    set({
      phase: 'day',
      screen: 'monitor',
      elapsed: 0,
      visibleNews: [],
      overlay: null,
      paused: false,
      currentPrices: Object.fromEntries(data.stocks.map((stock) => [stock.id, stock.startPrice])),
    })
  },
  engineTick: (deltaSeconds) => {
    const state = get()
    if (state.phase !== 'day' || state.paused) return
    const elapsed = Math.min(DAY_DURATION_SECONDS, state.elapsed + deltaSeconds)
    const progress = elapsed / DAY_DURATION_SECONDS
    const data = dayData(state)
    const currentPrices = Object.fromEntries(data.stocks.map((stock) => [stock.id, interpolate(stock.path, progress)]))
    const visibleNews = data.news.filter((item) => item.progress <= progress)
    set({ elapsed, currentPrices, visibleNews })
    if (elapsed >= DAY_DURATION_SECONDS) get().finishDay()
  },
  finishDay: () => {
    const state = get()
    const summary = { cycle: state.cycle, day: state.day, netWorth: calculateNetWorth(state), cash: state.cash }
    set({
      phase: 'night',
      screen: 'room',
      paused: false,
      overlay: null,
      dailySummaries: [...state.dailySummaries.filter((item) => item.cycle !== state.cycle || item.day !== state.day), summary],
    })
  },
  endNight: () => {
    const state = get()
    if (state.phase !== 'night') return
    if (state.day >= DAYS_PER_CYCLE) {
      set({ phase: 'settlement' })
      return
    }
    const nextDay = state.day + 1
    const data = state.market.days[nextDay - 1]
    set({
      day: nextDay,
      phase: 'premarket',
      screen: 'monitor',
      purchasedRumors: [],
      elapsed: 0,
      visibleNews: [],
      currentPrices: Object.fromEntries(data.stocks.map((stock) => [stock.id, stock.startPrice])),
      selectedStockId: data.stocks[0].id,
    })
  },
  settleCycle: () => {
    const state = get()
    if (state.phase !== 'settlement') return null
    if (state.cash < state.debt) {
      set({ phase: 'gameover' })
      return { result: 'gameover' }
    }
    const cash = state.cash - state.debt
    if (state.cycle >= MAX_CYCLES) {
      set({ cash, phase: 'clear' })
      return { result: 'clear' }
    }
    set({ cash, phase: 'loading' })
    return { result: 'next', cycle: state.cycle + 1 }
  },
  loadNextCycle: (market) => {
    const data = market.days[0]
    set({
      cycle: market.cycle,
      day: 1,
      debt: market.repayment,
      market,
      phase: 'premarket',
      screen: 'room',
      purchasedRumors: [],
      selectedStockId: data.stocks[0].id,
      currentPrices: Object.fromEntries(data.stocks.map((stock) => [stock.id, stock.startPrice])),
      visibleNews: [],
      elapsed: 0,
    })
  },
  selectStock: (selectedStockId) => set({ selectedStockId }),
  buy: (stockId, quantity) => {
    const state = get()
    if (state.phase !== 'day') return
    const price = state.currentPrices[stockId]
    const cost = price * quantity
    if (!price || quantity <= 0 || state.cash < cost) return
    const previous = state.holdings[stockId] || { quantity: 0, average: 0 }
    const nextQuantity = previous.quantity + quantity
    const average = (previous.average * previous.quantity + cost) / nextQuantity
    set({
      cash: state.cash - cost,
      holdings: { ...state.holdings, [stockId]: { quantity: nextQuantity, average } },
      feedback: { amount: -cost, id: Date.now() },
    })
  },
  sell: (stockId, quantity) => {
    const state = get()
    if (state.phase !== 'day') return
    const owned = state.holdings[stockId]
    const amount = Math.min(quantity, owned?.quantity || 0)
    if (amount <= 0) return
    const proceeds = state.currentPrices[stockId] * amount
    const holdings = { ...state.holdings }
    if (owned.quantity === amount) delete holdings[stockId]
    else holdings[stockId] = { ...owned, quantity: owned.quantity - amount }
    set({ cash: state.cash + proceeds, holdings, feedback: { amount: proceeds, id: Date.now() } })
  },
  showOverlay: (overlay) => set({ overlay, paused: true }),
  closeOverlay: () => set({ overlay: null, paused: false }),
  restart: () => set({ ...initialGame }),
}))

export function getNetWorth(state) {
  return calculateNetWorth(state)
}
