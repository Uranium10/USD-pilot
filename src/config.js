const viteEnv = import.meta.env || {}

export const DAY_DURATION_SECONDS = Number(viteEnv.VITE_DAY_DURATION_SECONDS) || 8 * 60
export const DAYS_PER_CYCLE = 7
export const LISTED_COMPANY_COUNT = 5
export const MARKET_ASSET_COUNT = 7 // 기업 5 + 코인 1 + 시지프 인텔리전스 1 (2026-08-10)
export const MAX_CYCLES = 6
export const EPILOGUE_CYCLE = MAX_CYCLES + 1
export const TICK_MS = 100
export const MAX_ENERGY = 100
export const JOB_ENERGY_COST = 85
export const JOB_REWARD = 600
export const CYBER_RUNNER_ENERGY_COST = 70
export const HACKING_DECK_COSTS = [6000, 12000, 24000, 48000]

// 시지프 인텔리전스 — 상시 상장된 7번째 특수 자산(작업지시서/STORY.md 반영, 2026-08-10).
// stock-1~stock-5(AI 서사가 참조하는 슬롯, server/ai/schemas.js STOCK_SLOT_IDS)와
// 겹치지 않는 id를 써서 AI 시장 생성 컴파일러가 이 자산을 절대 건드리지 않게 한다.
export const SISYPHUS_STOCK_ID = 'stock-sisyphus'
export const SISYPHUS_MAX_SHARES = 1000
export const SISYPHUS_MAJORITY_SHARES = 510 // 51% — 히든 엔딩(적대적 M&A) 자격선
// 5개 기업 기준가(61~191)보다 훨씬 높은 프리미엄 종목 — "달성 가능한 고가의 종목"
// 요구사항 반영. 사이클마다 회사들(연 2.5%)보다 가파르게(연 4%) 성장한다. 밸런싱 필요.
export const SISYPHUS_BASE_PRICE = 4200
export const SISYPHUS_CYCLE_GROWTH = 0.04
export const SISYPHUS_EPILOGUE_TARGET_PRICE = 320

export const COIN_ASSET_ID = 'coin-usd'
export const COIN_REFERENCE_PRICE = 250
export const COIN_SELL_SPREAD = 0.025
export const COIN_SEGMENT_MOVE_LIMIT = 0.45
export const COIN_DAILY_MIN_MULTIPLIER = 0.45
export const COIN_DAILY_MAX_MULTIPLIER = 1.55
export const COIN_ABSOLUTE_MIN_MULTIPLIER = 0.2
export const COIN_ABSOLUTE_MAX_MULTIPLIER = 5

// 채굴기는 크레딧이 아니라 코인을 생산한다. T.0의 기준가 환산 생산력은
// 0.0015 DUST/s × ₡250 × 480초 = 하루 ₡180. 거래일 길이가 바뀌어도 기존 경제 규모를
// 거래일 기준 투자 회수기간은 유지된다.
export const MINE_BASE_RATE = 0.0015
export const MINE_RATE_GROWTH = 1.2
export const MINE_INSTALL_COST = 3000
export const MINE_BASE_COST = 800
export const MINE_COST_GROWTH = 1.3
export const MAX_MINE_TIER_BY_CYCLE = [2, 3, 4, 5, 6, 6]

export const INFO_COST_MULTIPLIER = [1, 1.12, 1.28, 1.5, 1.75, 2.05]
export const VOLATILITY_BY_CYCLE = [1, 1, 1, 1.2, 1.35, 1.5]
export const STOCK_BASE_SIGMA = 0.035
export const STOCK_SHOCK_CHANCE = 0.12
export const STOCK_SHOCK_SIGMA = 0.11
export const STOCK_SEGMENT_MOVE_LIMIT = 0.36
export const STOCK_DAILY_MIN_MULTIPLIER = 0.5
export const STOCK_DAILY_MAX_MULTIPLIER = 1.5
export const COIN_VOLATILITY_BY_CYCLE = [1, 1.05, 1.1, 1.2, 1.3, 1.4]

// 부채 시스템(B 구조) — USD-spec/USD_debt_system.md 참고(실측 검증된 밸런스).
// "최소 상환액"과 "총 부채"를 분리해, 선상환(초과 상환)이 이자를 줄여 후반을 편하게
// 만들어주는 동시에 최소 상환액은 계속 올라 매 주기 압박을 유지한다.
export const INITIAL_DEBT = 165000 // 6주기에 걸쳐 갚을 전체 원금(총 부채 시작값)
export const INTEREST_RATE = 0.17 // 매 주기, 남은 총 부채에 붙는 이자율
export const DEBT_RATIO = 0.12 // 최소 상환액 중 "남은 부채 비례분" 비율
// 상승 하한(최소 상환액의 바닥값)을 주기별로 직접 지정한 계단형 곡선.
// 앞 3주는 완만하게(+1,500), 뒤 3주는 급격하게(+6,000~7,000) 조여온다 — 실측 밸런싱 결과.
export const FLOOR_BY_CYCLE = [19000, 24000, 30000, 40000, 54000, 72000]
