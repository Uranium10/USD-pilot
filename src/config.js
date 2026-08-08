const viteEnv = import.meta.env || {}

export const DAY_DURATION_SECONDS = Number(viteEnv.VITE_DAY_DURATION_SECONDS) || 8 * 60
export const DAYS_PER_CYCLE = 7
export const MAX_CYCLES = 6
export const TICK_MS = 100
export const MAX_ENERGY = 100
export const JOB_ENERGY_COST = 85
export const JOB_REWARD = 800
