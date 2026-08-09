import {
  EPILOGUE_CYCLE,
  DAY_DURATION_SECONDS,
  HACKING_DECK_COSTS,
  MAX_ENERGY,
  SISYPHUS_STOCK_ID,
} from '../src/config.js'
import { generateMarketCycle } from '../src/data/generateMarket.js'
import { useGameStore } from '../src/store/gameStore.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const cycleSix = generateMarketCycle({ cycle: 6, seed: 610 })
useGameStore.getState().loadMarket(cycleSix)
useGameStore.setState({ phase: 'settlement', cycle: 6, day: 7, cash: 5000, debt: 5000 })
const settlement = useGameStore.getState().settleCycle(5000)
assert(settlement?.result === 'epilogue' && settlement.cycle === EPILOGUE_CYCLE, '완납 후 7주차 진입 신호가 잘못됐습니다.')
assert(useGameStore.getState().marketReady === false, '7주차 시장을 받기 전에 진행 가능 상태가 되면 안 됩니다.')

const epilogueMarket = generateMarketCycle({ cycle: EPILOGUE_CYCLE, seed: 710, companyIds: cycleSix.companyIds })
useGameStore.getState().loadEpilogueCycle(epilogueMarket)
assert(useGameStore.getState().cycle === 7 && useGameStore.getState().day === 1, '7주차 첫날을 불러오지 못했습니다.')
useGameStore.getState().completeDayIntro()
for (let day = 1; day <= 7; day += 1) {
  useGameStore.setState({ phase: 'night', day })
  useGameStore.getState().endNight()
  if (day < 7) assert(useGameStore.getState().day === day + 1, `7주차 ${day}일 밤 이후 날짜 전환이 실패했습니다.`)
}
assert(useGameStore.getState().phase === 'ended' && useGameStore.getState().endingType === 'normal', '7주차 마지막 밤이 노멀 엔딩으로 이어지지 않습니다.')

useGameStore.getState().restart()
useGameStore.getState().loadMarket(generateMarketCycle({ cycle: 1, seed: 111 }))
useGameStore.setState({ phase: 'night', cash: 100000, energy: MAX_ENERGY })
assert(useGameStore.getState().upgradeHackingDeck(), '해킹 덱 v.0을 구입하지 못했습니다.')
assert(useGameStore.getState().hackingDeckLevel === 0, '해킹 덱 레벨이 저장되지 않았습니다.')
assert(useGameStore.getState().cash === 100000 - HACKING_DECK_COSTS[0], '해킹 덱 가격이 차감되지 않았습니다.')
assert(useGameStore.getState().startCyberRunner(), '사이버 러너 활동을 시작하지 못했습니다.')

const originalRandom = Math.random
const rolls = [0.9, 0]
Math.random = () => rolls.shift() ?? 0
try {
  useGameStore.getState().completeCyberRunner()
} finally {
  Math.random = originalRandom
}
assert(useGameStore.getState().holdings[SISYPHUS_STOCK_ID]?.quantity === 4, '사이버 러너의 시지프 주식 보상이 잘못됐습니다.')
assert(useGameStore.getState().nightActivity === null, '사이버 러너 완료 후 활동 잠금이 해제되지 않았습니다.')

useGameStore.getState().restart()
const infoMarket = generateMarketCycle({ cycle: 1, seed: 313 })
useGameStore.getState().loadMarket(infoMarket)
useGameStore.getState().completeDayIntro()
const stock = infoMarket.days[0].stocks[0]
const eventPoint = stock.path[1]
const eventDirection = eventPoint.price >= stock.path[0].price ? 'up' : 'down'
const trueRumor = { id: 'test-true', stockId: stock.id, direction: eventDirection, cost: 1, accuracy: 1, source: 'test', text: 'true', resolveProgress: eventPoint.progress, resolutionBasis: 'eventMove' }
const falseRumor = { id: 'test-false', stockId: stock.id, direction: stock.path.at(-1).price >= stock.startPrice ? 'down' : 'up', cost: 1, accuracy: 0, source: 'test', text: 'false', resolveProgress: 1, resolutionBasis: 'dayClose' }
useGameStore.setState({ cash: 100 })
assert(useGameStore.getState().purchaseRumors([trueRumor, falseRumor]), '정보 수명 검증용 정보를 구매하지 못했습니다.')
useGameStore.getState().startDay()
useGameStore.getState().engineTick(eventPoint.progress * DAY_DURATION_SECONDS + 0.1)
assert(useGameStore.getState().purchasedRumors.find((rumor) => rumor.id === trueRumor.id)?.status === 'completed', '적중 정보에 완료 표시가 붙지 않았습니다.')
useGameStore.getState().finishDay()
useGameStore.getState().enterNight()
assert(!useGameStore.getState().purchasedRumors.some((rumor) => rumor.id === trueRumor.id), '완료된 정보가 해당 날 밤에 사라지지 않았습니다.')
assert(useGameStore.getState().purchasedRumors.some((rumor) => rumor.id === falseRumor.id), '가짜 정보가 구매 당일 밤에 너무 일찍 사라졌습니다.')
useGameStore.getState().endNight()
useGameStore.setState({ phase: 'dayReport' })
useGameStore.getState().enterNight()
assert(!useGameStore.getState().purchasedRumors.some((rumor) => rumor.id === falseRumor.id), '가짜 정보가 이틀차 밤에 사라지지 않았습니다.')

console.log('스토리/7주차/해킹 덱 상태 머신 검증 통과')
