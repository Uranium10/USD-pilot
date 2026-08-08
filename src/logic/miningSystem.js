import { MINE_BASE_COST, MINE_BASE_RATE, MINE_COST_GROWTH, MINE_RATE_GROWTH } from '../config.js'

export function mineRate(tier) {
  if (tier < 0) return 0
  return MINE_BASE_RATE * MINE_RATE_GROWTH ** tier
}

export function mineUpgradeCost(tier) {
  return Math.round(MINE_BASE_COST * MINE_COST_GROWTH ** Math.max(0, tier))
}

export function nextMineTier(tier) {
  return tier + 1
}
