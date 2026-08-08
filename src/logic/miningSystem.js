import {
  COIN_REFERENCE_PRICE,
  MAX_MINE_TIER_BY_CYCLE,
  MINE_BASE_COST,
  MINE_BASE_RATE,
  MINE_COST_GROWTH,
  MINE_INSTALL_COST,
  MINE_RATE_GROWTH,
} from '../config.js'

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

export function maxMineTier(cycle) {
  return MAX_MINE_TIER_BY_CYCLE[cycle - 1] ?? MAX_MINE_TIER_BY_CYCLE.at(-1)
}

export function canUpgradeMine(tier, cycle) {
  return nextMineTier(tier) <= maxMineTier(cycle)
}

export function minePaybackSeconds(tier, coinPrice = COIN_REFERENCE_PRICE) {
  const additionalRate = mineRate(nextMineTier(tier)) - mineRate(tier)
  const additionalCreditRate = additionalRate * Math.max(0, coinPrice)
  return additionalCreditRate > 0 ? mineUpgradeCost(tier) / additionalCreditRate : Infinity
}
