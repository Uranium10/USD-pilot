const viteEnv = import.meta.env || {}

export const DAY_DURATION_SECONDS = Number(viteEnv.VITE_DAY_DURATION_SECONDS) || 8 * 60
export const DAYS_PER_CYCLE = 7
export const MAX_CYCLES = 6
export const TICK_MS = 100
export const MAX_ENERGY = 100
export const JOB_ENERGY_COST = 85
export const JOB_REWARD = 600

export const MINE_BASE_RATE = 0.25
export const MINE_RATE_GROWTH = 1.18
export const MINE_INSTALL_COST = 2400
export const MINE_BASE_COST = 600
export const MINE_COST_GROWTH = 1.25

export const INFO_COST_MULTIPLIER = [1, 1.12, 1.28, 1.5, 1.75, 2.05]
export const VOLATILITY_BY_CYCLE = [1, 1, 1, 1.2, 1.35, 1.5]

// 부채 시스템(B 구조) — USD-spec/USD_debt_system.md 참고(실측 검증된 밸런스).
// "최소 상환액"과 "총 부채"를 분리해, 선상환(초과 상환)이 이자를 줄여 후반을 편하게
// 만들어주는 동시에 최소 상환액은 계속 올라 매 주기 압박을 유지한다.
export const INITIAL_DEBT = 165000 // 6주기에 걸쳐 갚을 전체 원금(총 부채 시작값)
export const INTEREST_RATE = 0.17 // 매 주기, 남은 총 부채에 붙는 이자율
export const DEBT_RATIO = 0.12 // 최소 상환액 중 "남은 부채 비례분" 비율
// 상승 하한(최소 상환액의 바닥값)을 주기별로 직접 지정한 계단형 곡선.
// 앞 3주는 완만하게(+1,500), 뒤 3주는 급격하게(+6,000~7,000) 조여온다 — 실측 밸런싱 결과.
export const FLOOR_BY_CYCLE = [20000, 25000, 31000, 42000, 56000, 74000]
