const viteEnv = import.meta.env || {}

// 2026-08-10: 8분 → 4분. "하루가 지루하다"는 피드백에 따른 페이싱 변경이며, 경제 규모를
// 줄이려는 것이 아니다. 그래서 하루/주차당 벌 수 있는 금액은 그대로 두고 시간만 줄인다.
// - 시간에 비례하는 것은 채굴뿐이라 MINE_BASE_RATE를 2배로 올려 하루 생산량을 보존했다.
// - 알바·야간 활동은 밤(무제한)에 일어나므로 애초에 낮 길이와 무관하다.
// - 주가 경로는 진행률(0~1) 기준이라 등락 폭이 그대로다. 같은 변동이 절반의 시간에
//   일어나므로 하루 수익 기회는 유지되고 판단 시간만 짧아진다.
// - 정보 가격·7주차 시지프 목표는 유지한다. 부채 곡선은 이후 별도 밸런싱한다.
export const DAY_DURATION_SECONDS = Number(viteEnv.VITE_DAY_DURATION_SECONDS) || 4 * 60
// 게임 내 장 시계. 낮 스테이지의 실시간 길이와 별개로, 화면에 표시되는 시각은 이 구간에
// 선형 매핑된다 — 작업표시줄 시계, 속보 발표 시각, 차트 시간축이 모두 같은 시계를 쓴다.
// 2026-08-10: 하루가 8분 → 4분이 되면서 기존 09:00~18:00(9시간)을 그대로 두면 게임 내
// 시계가 두 배 빨라져 분 단위가 눈에 띄게 튄다. 실시간 1초당 게임 내 1.125분이라는 기존
// 속도를 유지하도록 장 운영 시간을 절반(4시간 30분)으로 줄여 09:00~13:30으로 맞췄다.
export const MARKET_OPEN_MINUTE = 9 * 60
export const MARKET_SESSION_MINUTES = 4.5 * 60

// 잔여 시간이 이 값 아래로 내려가면 장 마감 표시가 빨갛게 바뀐다. 하루 길이의 1/8로 두어
// 하루가 바뀌어도 경고 구간이 차지하는 비중이 같다(8분이면 60초 = 기존 동작, 4분이면 30초).
export const MARKET_CLOSING_WARN_SECONDS = DAY_DURATION_SECONDS / 8

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
// 0.003 DUST/s × ₡250 × 240초 = 하루 ₡180.
// 2026-08-10 하루가 480초 → 240초로 줄면서 0.0015 → 0.003으로 2배 올렸다. 채굴만이
// 유일하게 실시간에 비례하는 수입원이라, 레이트를 그대로 두면 하루 채굴 수입이 절반이
// 되어 부채 곡선의 전제(안전망 커버율)가 무너진다. 2배로 올리면 하루 생산량(₡180),
// 주차 생산량, 그리고 거래일 기준 투자 회수기간이 모두 이전과 정확히 동일하다.
export const MINE_BASE_RATE = 0.003
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
// 더스트는 직접 매수할 수 없는 채굴·보유 자산이다. 초기에 채굴기를 설치하고 매도를
// 미룬 플레이어가 후반에 보상받도록 장기 기준가는 주차마다 상승한다. 단기 급락과 높은
// 분산은 그대로 유지해 언제 현금화할지에 대한 판단은 남긴다.
export const COIN_GROWTH_TARGET_BY_CYCLE = [1, 1.13, 1.28, 1.45, 1.64, 1.85, 2.05]
export const COIN_SEGMENT_DRIFT_BY_CYCLE = [0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018]

// 부채 시스템(B 구조) — USD-spec/USD_debt_system.md 참고(실측 검증된 밸런스).
// "최소 상환액"과 "총 부채"를 분리해, 선상환(초과 상환)이 이자를 줄여 후반을 편하게
// 만들어주는 동시에 최소 상환액은 계속 올라 매 주기 압박을 유지한다.
export const INITIAL_DEBT = 165000 // 6주기에 걸쳐 갚을 전체 원금(총 부채 시작값)
export const INTEREST_RATE = 0.17 // 매 주기, 남은 총 부채에 붙는 이자율
export const DEBT_RATIO = 0.12 // 최소 상환액 중 "남은 부채 비례분" 비율
export const DEBT_PAYMENT_RELIEF = 1000 // 2026-08-11: 전 주차 최소 상환액을 기존보다 ₡1,000 완화
// 상승 하한(최소 상환액의 바닥값)을 주기별로 직접 지정한 계단형 곡선.
// 초반은 완만하고 후반으로 갈수록 주차 간 증가폭이 커지도록 실측 조정한 값이다.
export const FLOOR_BY_CYCLE = [18000, 23000, 29000, 39000, 53000, 71000]
