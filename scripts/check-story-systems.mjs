import {
  EPILOGUE_CYCLE,
  DAY_DURATION_SECONDS,
  HACKING_DECK_COSTS,
  MAX_ENERGY,
  SISYPHUS_STOCK_ID,
} from '../src/config.js'
import { generateMarketCycle } from '../src/data/generateMarket.js'
import { NIGHT_ACTIVITIES, NIGHT_ITEMS } from '../src/data/nightContent.js'
import { compileScenario, isAiScenarioCycle } from '../server/ai/aiMarketCycle.js'
import { cycleScenarioOutputConfig, findScenarioCopyIssues } from '../server/ai/cycleScenarioModel.js'
import { newsBody } from '../src/logic/newsText.js'
import { computeGameScale } from '../src/services/viewportScale.js'
import { buildCycleScenarioUserPrompt } from '../server/ai/prompts/cycleScenario.js'
import { buildRunPlanUserPrompt } from '../server/ai/prompts/runPlan.js'
import { CYCLE_SCENARIO_SCHEMA, CYCLE_SCENARIO_VERBOSE_SCHEMA, RUN_PLAN_SCHEMA } from '../server/ai/schemas.js'
import { parseDialogueBold, renderDialogueTemplate } from '../src/logic/dialogueTemplate.js'
import { createDonationSchedule, getNightActivityOptions, nightActivityCashCost } from '../src/logic/nightActivities.js'
import { chooseWeeklyModifier, getWeeklyModifier, modifiedNightEnergyCost, modifiedNightReward, modifiedRumorCost } from '../src/logic/weeklyModifiers.js'
import { ENDING_BACKGROUNDS, ENDING_TEMPLATES } from '../src/data/endingTemplates.js'
import { getNetWorth, useGameStore } from '../src/store/gameStore.js'
import { MAX_FRESH_CYCLE_ONE_PER_WINDOW, RESTART_REUSE_MS, RESTART_WINDOW_MS, nextRestartWindow, restartProtectionDecision } from '../server/restartProtection.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const restartNow = 2_000_000_000_000
const restartCache = { market: {}, runPlan: {}, worldState: {}, cachedAt: restartNow, windowStartedAt: restartNow, freshCount: 1 }
assert(restartProtectionDecision(restartCache, restartNow + RESTART_REUSE_MS - 1).reason === 'cooldown', '30분 내 재시작 보호가 작동하지 않습니다.')
const limitedCache = { ...restartCache, cachedAt: restartNow - RESTART_REUSE_MS, freshCount: MAX_FRESH_CYCLE_ONE_PER_WINDOW }
assert(restartProtectionDecision(limitedCache, restartNow + RESTART_REUSE_MS).reason === 'daily-limit', '24시간 신규 생성 제한이 작동하지 않습니다.')
assert(!restartProtectionDecision(limitedCache, restartNow + RESTART_WINDOW_MS + 1).reuse, '24시간 창이 지난 캐시가 계속 강제 재사용됩니다.')
assert(nextRestartWindow(limitedCache, restartNow + RESTART_WINDOW_MS + 1).freshCount === 1, '새 24시간 창의 생성 횟수가 초기화되지 않습니다.')

const dialogueVariables = { cycle: 3, cash: 12500, worldState: { codename: 'METIS' }, action: () => 'blocked' }
assert(renderDialogueTemplate('{{cycle}}주차 · {{cash}} 크레딧 · {{worldState.codename}}', dialogueVariables) === '3주차 · 12,500 크레딧 · METIS', '대화 변수 치환이 잘못됐습니다.')
assert(renderDialogueTemplate('{{missing}} / {{action}} / {{constructor}}', dialogueVariables) === '{{missing}} / {{action}} / {{constructor}}', '대화 템플릿이 허용되지 않은 값을 노출했습니다.')
assert(JSON.stringify(parseDialogueBold('평문 **강조** 끝')) === JSON.stringify([
  { text: '평문 ', bold: false },
  { text: '강조', bold: true },
  { text: ' 끝', bold: false },
]), '대화 굵은 글씨 구문을 올바르게 분리하지 못했습니다.')

const modifier2 = chooseWeeklyModifier(2, 2026)
const modifier3 = chooseWeeklyModifier(3, 2027, modifier2.id)
assert(modifier2 && modifier3 && modifier2.id !== modifier3.id, '주간 모디파이어가 없거나 연속 중복되었습니다.')
assert(chooseWeeklyModifier(2, 2026)?.id === modifier2.id, '같은 seed의 주간 모디파이어가 바뀝니다.')
assert(chooseWeeklyModifier(1, 2026) === null && chooseWeeklyModifier(7, 2026) === null, '1·7주차에는 일반 모디파이어가 없어야 합니다.')
assert(getWeeklyModifier(modifier2.id)?.detail, '주간 모디파이어의 안내 문구가 없습니다.')
assert(modifiedRumorCost({ cost: 100 }, 'information-crackdown') === 75, '정보 단속 가격 보정이 잘못됐습니다.')
assert(Object.keys(ENDING_BACKGROUNDS).length === 2, '엔딩 더미 배경은 두 장이어야 합니다.')
for (const endingType of ['bad', 'normal', 'hidden', 'true']) {
  const ending = ENDING_TEMPLATES[endingType]
  assert(ending?.lines.length >= 3, `${endingType} 엔딩 대사 템플릿이 부족합니다.`)
  assert(new Set(ending.lines.map((line) => line.background).filter(Boolean)).size >= 2, `${endingType} 엔딩이 두 배경을 사용하지 않습니다.`)
}
assert(modifiedNightEnergyCost(30, 'night-curfew') === 40 && modifiedNightReward(1000, 'night-curfew') === 1300, '야간 통행 제한 보정이 잘못됐습니다.')

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

useGameStore.getState().restart()
const settlementMarket = generateMarketCycle({ cycle: 1, seed: 1201 })
useGameStore.getState().loadMarket(settlementMarket)
useGameStore.setState({ phase: 'settlement', cycle: 1, day: 7, cash: 50000, debt: 165000, holdings: {}, activeScene: null })
const nextSettlement = useGameStore.getState().settleCycle(20000)
assert(nextSettlement?.result === 'next' && useGameStore.getState().cash === 30000, '1주차 상환액이 현금에서 차감되지 않았습니다.')
const secondMarket = generateMarketCycle({ cycle: 2, seed: 2202, companyIds: settlementMarket.companyIds })
useGameStore.getState().loadNextCycle(secondMarket)
assert(getNetWorth(useGameStore.getState()) === 30000 && useGameStore.getState().dayStartNetWorth === 30000, '2주차 총자산 기준이 상환 전 금액을 유지합니다.')
useGameStore.getState().completeDayIntro()
assert(useGameStore.getState().activeScene?.id.startsWith('weekly-modifier-c2-'), '2주차 시작 모디파이어 대화가 열리지 않았습니다.')
useGameStore.getState().closeScene()

const cycleSix = generateMarketCycle({ cycle: 6, seed: 610 })
useGameStore.getState().loadMarket(cycleSix)
useGameStore.setState({ phase: 'settlement', cycle: 6, day: 7, cash: 5000, debt: 5000 })
const settlement = useGameStore.getState().settleCycle(5000)
assert(settlement?.result === 'epilogue' && settlement.cycle === EPILOGUE_CYCLE, '완납 후 7주차 진입 신호가 잘못됐습니다.')
assert(useGameStore.getState().marketReady === false, '7주차 시장을 받기 전에 진행 가능 상태가 되면 안 됩니다.')

const epilogueMarket = generateMarketCycle({ cycle: EPILOGUE_CYCLE, seed: 710, companyIds: cycleSix.companyIds })
assert(isAiScenarioCycle(EPILOGUE_CYCLE) && !isAiScenarioCycle(EPILOGUE_CYCLE + 1), 'AI 시나리오 생성 범위가 7주차까지 열려 있지 않습니다.')
assert(CYCLE_SCENARIO_SCHEMA.properties.cycle.enum.includes(7), 'CycleScenario 스키마가 7주차를 거부합니다.')
assert(!CYCLE_SCENARIO_SCHEMA.properties.companyStates && !CYCLE_SCENARIO_SCHEMA.properties.openingNarration, '기본 CycleScenario에 미사용 상위 필드가 남아 있습니다.')
assert(!CYCLE_SCENARIO_SCHEMA.properties.days.items.properties.events.items.properties.detail, '기본 CycleScenario 이벤트에 미사용 상세 필드가 남아 있습니다.')
assert(CYCLE_SCENARIO_VERBOSE_SCHEMA.properties.companyStates && CYCLE_SCENARIO_VERBOSE_SCHEMA.properties.days.items.properties.events.items.properties.detail, 'verbose 복구 스키마가 손상되었습니다.')
assert(cycleScenarioOutputConfig('verbose').schema === CYCLE_SCENARIO_VERBOSE_SCHEMA, 'AI_CYCLE_SCHEMA_MODE=verbose 복구 경로가 연결되지 않았습니다.')
assert(cycleScenarioOutputConfig().schema === CYCLE_SCENARIO_SCHEMA, '기본 CycleScenario가 슬림 스키마를 사용하지 않습니다.')
assert(RUN_PLAN_SCHEMA.properties.arcs.items.properties.landingCycle.enum.includes(7), 'RunPlan 스키마가 7주차 결말 아크를 거부합니다.')
assert(buildRunPlanUserPrompt().includes('cycle 1~7'), 'RunPlan 프롬프트가 7주차를 요청하지 않습니다.')
assert(buildCycleScenarioUserPrompt({ cycle: 7, runPlan: { arcs: [] } }).includes('에필로그'), '7주차 시나리오 프롬프트에 에필로그 지시가 없습니다.')
const companyPrompt = buildCycleScenarioUserPrompt({
  cycle: 1,
  runPlan: { arcs: [] },
  companies: [{ id: 'stock-1', name: '오비탈 레일', sector: '궤도 건설' }],
})
assert(companyPrompt.includes('stock-1: 오비탈 레일 (궤도 건설)'), '주간 GPT 프롬프트에 종목별 실제 기업명이 전달되지 않습니다.')
const validCopyScenario = {
  days: Array.from({ length: 7 }, (_, index) => ({
    day: index + 1,
    events: [{ headline: '오비탈 레일이 신규 보수 계약을 체결해 매출 증가가 예상됐다.' }],
    rumorSeeds: [{ angle: '건설 자재가 신규 작업 구역으로 이송되면서 계약 확대 가능성이 커졌다.' }],
  })),
}
assert(findScenarioCopyIssues(validCopyScenario).length === 0, '정상적인 한국어 뉴스와 정보가 문장 검증에서 거부됐습니다.')
const brokenCopyScenario = structuredClone(validCopyScenario)
brokenCopyScenario.days[0].events[0].headline = 'stock-1 급여명세서에 새 공제 코드 등장...'
assert(findScenarioCopyIssues(brokenCopyScenario).some((issue) => issue.includes('internal stock id')), '내부 종목 ID가 노출된 뉴스를 걸러내지 못했습니다.')

// 소문이 같은 날 사건을 가리키지 않으면 compileScenario가 그 소문을 버린다 —
// 검증에서 먼저 잡아 재생성으로 이어져야 정보 상점이 조용히 비지 않는다.
const orphanRumorScenario = {
  days: [{
    day: 1,
    events: [{ eventId: 'e1', headline: '오비탈 레일이 신규 보수 계약을 체결해 매출 증가가 예상됐다.' }],
    rumorSeeds: [{ targetEventId: 'e-does-not-exist', angle: '건설 자재가 신규 작업 구역으로 이송되면서 계약 확대 가능성이 커졌다.' }],
  }],
}
assert(
  findScenarioCopyIssues(orphanRumorScenario).some((issue) => issue.includes('orphan target')),
  '존재하지 않는 사건을 가리키는 소문을 걸러내지 못했습니다.',
)

// 자기 종목은 언급하지 않고 다른 상장사만 언급하는 헤드라인 — 화면에서는 A 종목 뉴스인데
// 본문은 B 이야기만 하는 상태가 된다(2026-08-10 Luna low 실측에서 발견된 어색함).
const scenarioCompanies = [
  { id: 'stock-1', name: '오비탈 레일', sector: '궤도 건설' },
  { id: 'stock-2', name: '리본 안드로이드', sector: '폐기물 재활용' },
]
const mismatchScenario = {
  days: [{
    day: 1,
    events: [{ eventId: 'e1', primaryStockId: 'stock-1', headline: '궤도 위생국이 리본 안드로이드의 폐기물 처리 인증을 취소했다.' }],
    rumorSeeds: [{ targetEventId: 'e1', angle: '감사 인력이 처리장 계측 기록을 따로 확보했다는 이야기가 돌고 있다.' }],
  }],
}
assert(
  findScenarioCopyIssues(mismatchScenario, { companies: scenarioCompanies }).some((issue) => issue.includes('subject mismatch')),
  '다른 기업만 언급하는 헤드라인을 주체 불일치로 잡아내지 못했습니다.',
)
// 어떤 기업도 언급하지 않는 문장은 종목명 표시가 주어 역할을 하므로 통과해야 한다.
const neutralSubjectScenario = structuredClone(mismatchScenario)
neutralSubjectScenario.days[0].events[0].headline = '규제 당국이 임상 자료 제출 기한을 2주 연장했다.'
assert(
  !findScenarioCopyIssues(neutralSubjectScenario, { companies: scenarioCompanies }).some((issue) => issue.includes('subject mismatch')),
  '기업명이 없는 정상 문장을 주체 불일치로 잘못 판정했습니다.',
)

// 속보 본문의 종목명 접두사 제거는 실제로 그 이름으로 시작할 때만 일어나야 한다.
assert(
  newsBody('오비탈 레일, 궤도 6구역 수주가 확대됐다.', '오비탈 레일') === '궤도 6구역 수주가 확대됐다.',
  '본문 앞의 중복 종목명 접두사가 제거되지 않았습니다.',
)
assert(
  newsBody('감사원 발표에 따르면, 오비탈 레일이 계약을 재검증받는다.', '오비탈 레일')
    === '감사원 발표에 따르면, 오비탈 레일이 계약을 재검증받는다.',
  '종목명으로 시작하지 않는 문장의 앞부분이 잘렸습니다.',
)
assert(
  newsBody('오비탈 레일이 신규 계약을 체결했다.', '오비탈 레일') === '오비탈 레일이 신규 계약을 체결했다.',
  '구분자 없이 이어지는 종목명을 잘못 잘라냈습니다.',
)
// 화면 배율: 고정 1024×768을 화면에 맞춰 균일 축소한다(가로/세로 중 더 빡빡한 쪽 기준).
assert(computeGameScale(1024, 768) === 1, '디자인 해상도에서 배율이 1이 아닙니다.')
assert(computeGameScale(2048, 1536) === 2, '큰 화면에서 배율이 확대되지 않습니다.')
// 4:3보다 넓은 화면은 높이가, 좁은 화면은 폭이 배율을 결정해야 레터박스가 유지된다.
assert(computeGameScale(1920, 768) === 1, '가로로 넓은 화면에서 높이 기준 배율이 아닙니다.')
assert(computeGameScale(1024, 384) === 0.5, '세로로 낮은 화면에서 높이 기준 배율이 아닙니다.')
assert(computeGameScale(512, 768) === 0.5, '세로로 긴 화면에서 폭 기준 배율이 아닙니다.')
// 모바일 가로(844×390)가 세로(390×844)보다 커야 가로 전환 안내가 의미를 갖는다.
assert(
  computeGameScale(844, 390) > computeGameScale(390, 844),
  '모바일 가로 배율이 세로보다 크지 않습니다.',
)
assert(computeGameScale(0, 0) === 1 && computeGameScale(-1, 100) === 1, '비정상 크기에서 배율이 1로 보호되지 않습니다.')

const compiledEpilogue = compileScenario(generateMarketCycle({ cycle: 7, seed: 711, companyIds: cycleSix.companyIds }), {
  cycle: 7,
  title: 'AI 에필로그 검증',
  days: Array.from({ length: 7 }, (_, index) => ({
    day: index + 1,
    events: index === 0 ? [{ eventId: 'ai-c7-d1-e1', primaryStockId: 'stock-1', direction: 'down', magnitude: 'minor', impactProgress: 0.45, headline: 'AI 후일담 뉴스' }] : [],
    rumorSeeds: index === 0 ? [{ targetEventId: 'ai-c7-d1-e1', sourceArchetype: 'worker', confidence: 'medium', angle: '현장 인력이 후속 정리 작업에 착수했다.' }] : [],
  })),
})
assert(compiledEpilogue.aiGenerated && compiledEpilogue.days[0].news.some((item) => item.id === 'ai-c7-d1-e1'), '7주차 AI 기업 뉴스가 시장에 컴파일되지 않았습니다.')
assert(compiledEpilogue.days[0].news.some((item) => item.id === 'c7-d1-sisyphus-collapse'), '7주차 AI 컴파일이 시지프 고정 폭락 뉴스를 제거했습니다.')
assert(compiledEpilogue.days[0].rumors.some((item) => item.source === '현장 노동자'), 'AI 정보원 유형이 내부 영어 ID로 노출됩니다.')
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
assert(NIGHT_ITEMS.discardedBurger.energyRestore === 30, '폐기 햄버거의 활동력 회복량이 잘못됐습니다.')
assert(NIGHT_ACTIVITIES.convenienceJob.reward.itemId === NIGHT_ITEMS.discardedBurger.id && NIGHT_ACTIVITIES.convenienceJob.reward.chance === 0.15, '편의점 폐기 햄버거 보상이 잘못됐습니다.')
assert(Object.values(NIGHT_ACTIVITIES).filter((activity) => activity.reward?.itemId === NIGHT_ITEMS.discardedBurger.id).length === 1, '폐기 햄버거는 편의점 활동에서만 획득할 수 있어야 합니다.')
const donationSchedule = createDonationSchedule(111)
assert(donationSchedule.length === 3 && new Set(donationSchedule.map((entry) => entry.cycle)).size === 3, '기부 활동이 1~5주차 중 서로 다른 세 주에 배정되지 않았습니다.')
assert(donationSchedule.every((entry) => entry.cycle >= 1 && entry.cycle <= 5 && entry.day >= 1 && entry.day <= 7), '기부 활동 일정이 5주차 또는 7일 범위를 벗어났습니다.')
assert([0, 1, 2].map((count) => nightActivityCashCost(NIGHT_ACTIVITIES.donation, count)).join(',') === '1000,2000,3000', '기부 순서별 금액이 잘못됐습니다.')
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

useGameStore.setState({ phase: 'night', cycle: 1, day: 1, cash: 10000, energy: MAX_ENERGY, completedNightActivityIds: [], donationSchedule: [{ cycle: 1, day: 1 }], donationCount: 0 })
assert(useGameStore.getState().startNightActivity(NIGHT_ACTIVITIES.donation.id), '일정에 배정된 기부 활동을 시작하지 못했습니다.')
useGameStore.getState().completeNightActivity()
assert(useGameStore.getState().cash === 9000 && useGameStore.getState().donationCount === 1, '첫 기부 금액 또는 횟수가 잘못 반영됐습니다.')

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
