const viteEnv = import.meta.env || {}

export const DAY_DURATION_SECONDS = Number(viteEnv.VITE_DAY_DURATION_SECONDS) || 8 * 60
export const DAYS_PER_CYCLE = 7
export const MAX_CYCLES = 6
export const TICK_MS = 100
export const MAX_ENERGY = 100
export const JOB_ENERGY_COST = 85
export const JOB_REWARD = 800

// 부채 시스템(B 구조) — USD-spec/USD_작업지시서.md 참고.
// "최소 상환액"과 "총 부채"를 분리해, 선상환(초과 상환)이 이자를 줄여 후반을 편하게
// 만들어주는 동시에 최소 상환액은 계속 올라 매 주기 압박을 유지한다.
export const INITIAL_DEBT = 40000 // 6주기에 걸쳐 갚을 전체 원금(총 부채 시작값)
export const INTEREST_RATE = 0.20 // 매 주기, 남은 총 부채에 붙는 이자율
export const DEBT_RATIO = 0.30 // 최소 상환액 중 "남은 부채 비례분" 비율
export const FLOOR_BASE = 11000 // 상승 하한의 1주기 값(초기 자금과 동일선상)
export const FLOOR_GROWTH = 1.22 // 상승 하한의 주기당 증가율(압박 곡선)
