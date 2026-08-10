import { INFO_COST_MULTIPLIER } from '../config.js'

export const IMPACT_BY_MAGNITUDE = Object.freeze({
  minor: 0.08,
  medium: 0.16,
  major: 0.28,
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function classifyImpactMagnitude(expectedImpact) {
  const impact = Math.abs(Number(expectedImpact) || 0)
  if (impact < 0.1) return 'minor'
  if (impact < 0.2) return 'medium'
  return 'major'
}

export function informationCost({ accuracy, expectedImpact, cycle }) {
  const confidence = clamp(Number(accuracy) || 0, 0, 1)
  const impact = Math.abs(Number(expectedImpact) || 0)
  const impactFactor = clamp(Math.pow(impact / IMPACT_BY_MAGNITUDE.minor, 0.85), 0.25, 3)
  const cycleMultiplier = INFO_COST_MULTIPLIER[cycle - 1] ?? INFO_COST_MULTIPLIER.at(-1)
  return Math.max(25, Math.round((50 + confidence * 180) * impactFactor * cycleMultiplier))
}
