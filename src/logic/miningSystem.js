import { MINE_BASE_COST, MINE_BASE_RATE, MINE_COST_GROWTH, MINE_INSTALL_COST, MINE_RATE_GROWTH } from '../config.js'

export function mineRate(tier) {
  if (tier < 0) return 0
  return MINE_BASE_RATE * MINE_RATE_GROWTH ** tier
}

export function mineUpgradeCost(tier) {
  if (tier < 0) return MINE_INSTALL_COST
  return Math.round(MINE_BASE_COST * MINE_COST_GROWTH ** tier)
}

export function nextMineTier(tier) {
  return tier + 1
}

export function minePaybackSeconds(tier) {
  const additionalRate = mineRate(nextMineTier(tier)) - mineRate(tier)
  return additionalRate > 0 ? mineUpgradeCost(tier) / additionalRate : Infinity
}
