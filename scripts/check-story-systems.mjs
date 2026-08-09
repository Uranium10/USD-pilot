import {
  EPILOGUE_CYCLE,
  DAY_DURATION_SECONDS,
  HACKING_DECK_COSTS,
  MAX_ENERGY,
  SISYPHUS_STOCK_ID,
} from '../src/config.js'
import { generateMarketCycle } from '../src/data/generateMarket.js'
import { NIGHT_ACTIVITIES, NIGHT_ITEMS } from '../src/data/nightContent.js'
import { parseDialogueBold, renderDialogueTemplate } from '../src/logic/dialogueTemplate.js'
import { getNightActivityOptions } from '../src/logic/nightActivities.js'
import { useGameStore } from '../src/store/gameStore.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const dialogueVariables = { cycle: 3, cash: 12500, worldState: { codename: 'METIS' }, action: () => 'blocked' }
assert(renderDialogueTemplate('{{cycle}}주차 · {{cash}} 크레딧 · {{worldState.codename}}', dialogueVariables) === '3주차 · 12,500 크레딧 · METIS', '대화 변수 치환이 잘못됐습니다.')
assert(renderDialogueTemplate('{{missing}} / {{action}} / {{constructor}}', dialogueVariables) === '{{missing}} / {{action}} / {{constructor}}', '대화 템플릿이 허용되지 않은 값을 노출했습니다.')
assert(JSON.stringify(parseDialogueBold('평문 **강조** 끝')) === JSON.stringify([
  { text: '평문 ', bold: false },
  { text: '강조', bold: true },
  { text: ' 끝', bold: false },
]), '대화 굵은 글씨 구문을 올바르게 분리하지 못했습니다.')

useGameStore.getState().restart()
useGameStore.getState().beginLoading()
assert(useGameStore.getState().phase === 'introChoice' && useGameStore.getState().introPrompt === 'prologue', '새 게임의 프롤로그 선택창이 열리지 않았습니다.')
const firstMarket = generateMarketCycle({ cycle: 1, seed: 101 })
useGameStore.getState().loadMarket(firstMarket)
assert(useGameStore.getState().phase === 'introChoice' && useGameStore.getState().marketReady, '시장 생성 완료가 시작 선택창을 건너뛰었습니다.')
useGameStore.getState().choosePrologue(true)
assert(useGameStore.getState().phase === 'prologue' && useGameStore.getState().activeScene?.id === 'prologue-day1', '프롤로그 보기 선택이 장면을 시작하지 못했습니다.')
useGameStore.getState().closeScene()
assert(useGameStore.getState().phase === 'introChoice' && useGameStore.getState().introPrompt === 'tutorial', '프롤로그 종료 후 튜토리얼 선택창으로 이어지지 않았습니다.')
useGameStore.getState().chooseTutorial(true)
assert(useGameStore.getState().phase === 'tutorial', '튜토리얼 보기 선택이 안내를 시작하지 못했습니다.')
useGameStore.getState().completeTutorial()
assert(useGameStore.getState().phase === 'dayIntro', '튜토리얼 종료 후 날짜 전환 화면으로 이어지지 않았습니다.')
useGameStore.getState().completeDayIntro()
assert(useGameStore.getState().phase === 'premarket', '날짜 전환 후 정보 선택 화면으로 이어지지 않았습니다.')
assert(useGameStore.getState().screen === 'monitor', '첫 날짜 전환 후 정보 선택 화면이 열리지 않았습니다.')

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

const firstWeekActivities = getNightActivityOptions(1, 4, 111)
assert(firstWeekActivities.length === 1 && firstWeekActivities[0].id === 'convenience-job', '1주차에는 편의점 활동만 나와야 합니다.')
const secondWeekActivities = getNightActivityOptions(2, 4, 111)
assert(secondWeekActivities[0].id === 'convenience-job' && secondWeekActivities.length >= 2 && secondWeekActivities.length <= 3, '2주차 활동 추첨 수가 잘못됐습니다.')
assert(JSON.stringify(secondWeekActivities) === JSON.stringify(getNightActivityOptions(2, 4, 111)), '같은 날짜의 야간 활동 목록이 다시 계산할 때 바뀝니다.')
const fourthWeekActivities = getNightActivityOptions(4, 4, 111)
assert(fourthWeekActivities.length >= 4 && fourthWeekActivities.length <= 5, '4주차 이후에는 편의점 외 활동이 3~4개 나와야 합니다.')
for (let cycle = 2; cycle <= 6; cycle += 1) {
  assert(Object.values(NIGHT_ACTIVITIES).filter((activity) => activity.unlockCycle === cycle).length === 4, `${cycle}주차 활동 풀이 4개가 아닙니다.`)
}
assert(NIGHT_ITEMS.superCola.energyRestore === 60, '슈퍼 콜라의 활동력 회복량이 잘못됐습니다.')
assert(NIGHT_ACTIVITIES.stationWalk.reward.itemId === NIGHT_ITEMS.superCola.id, '산책이 슈퍼 콜라를 지급하지 않습니다.')
assert(Object.values(NIGHT_ACTIVITIES).filter((activity) => activity.reward?.itemId === NIGHT_ITEMS.superCola.id).length === 1, '슈퍼 콜라는 산책에서만 획득할 수 있어야 합니다.')
assert(NIGHT_ACTIVITIES.recyclingRun.reward.collectibleItemId === NIGHT_ITEMS.teddyBear.id, '폐기물 수거에 곰인형 보상이 연결되지 않았습니다.')

useGameStore.setState({ phase: 'night', nightActivity: { id: NIGHT_ACTIVITIES.recyclingRun.id }, inventory: {}, completedNightActivityIds: [], energy: MAX_ENERGY })
Math.random = (() => { const values = [1, 0]; return () => values.shift() ?? 0 })()
try {
  useGameStore.getState().completeNightActivity()
} finally {
  Math.random = originalRandom
}
assert(useGameStore.getState().inventory[NIGHT_ITEMS.teddyBear.id] === 1, '폐기물 수거에서 곰인형을 획득하지 못했습니다.')
useGameStore.setState({ nightActivity: { id: NIGHT_ACTIVITIES.recyclingRun.id } })
Math.random = () => 0
try {
  useGameStore.getState().completeNightActivity()
} finally {
  Math.random = originalRandom
}
assert(useGameStore.getState().inventory[NIGHT_ITEMS.teddyBear.id] === 1, '곰인형이 세션에서 중복 획득됐습니다.')

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
assert(useGameStore.getState().nightTutorialPrompt && !useGameStore.getState().nightTutorialSeen, '첫날 밤 튜토리얼 선택창이 최초 진입 때 열리지 않았습니다.')
useGameStore.getState().chooseNightTutorial(true)
assert(useGameStore.getState().showNightTutorial && useGameStore.getState().nightTutorialSeen, '야간 튜토리얼 보기 선택이 안내를 시작하지 못했습니다.')
useGameStore.getState().closeNightTutorial()
assert(!useGameStore.getState().showNightTutorial && useGameStore.getState().nightTutorialSeen, '첫날 밤 튜토리얼 건너뛰기가 상태를 보존하지 못했습니다.')
assert(!useGameStore.getState().purchasedRumors.some((rumor) => rumor.id === trueRumor.id), '완료된 정보가 해당 날 밤에 사라지지 않았습니다.')
assert(useGameStore.getState().purchasedRumors.some((rumor) => rumor.id === falseRumor.id), '가짜 정보가 구매 당일 밤에 너무 일찍 사라졌습니다.')
useGameStore.getState().endNight()
useGameStore.setState({ phase: 'dayReport' })
useGameStore.getState().enterNight()
assert(!useGameStore.getState().showNightTutorial, '첫날 밤 튜토리얼이 같은 세션에서 다시 열렸습니다.')
assert(!useGameStore.getState().purchasedRumors.some((rumor) => rumor.id === falseRumor.id), '가짜 정보가 이틀차 밤에 사라지지 않았습니다.')

useGameStore.getState().restart()
useGameStore.getState().beginLoading()
useGameStore.getState().loadMarket(generateMarketCycle({ cycle: 1, seed: 414 }))
useGameStore.getState().skipIntro()
assert(useGameStore.getState().phase === 'dayIntro' && useGameStore.getState().tutorialCompleted, '프롤로그와 튜토리얼 전체 건너뛰기가 날짜 화면으로 이어지지 않았습니다.')
assert(useGameStore.getState().playedSceneIds.includes('prologue-day1'), '전체 건너뛰기 후 프롤로그가 뒤늦게 재생될 수 있습니다.')

console.log('스토리/7주차/해킹 덱 상태 머신 검증 통과')
