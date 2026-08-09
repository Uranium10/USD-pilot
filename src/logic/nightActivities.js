import { NIGHT_ACTIVITIES } from '../data/nightContent.js'

function hashSeed(value) {
  let hash = 2166136261
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed) {
  let value = seed >>> 0
  return () => {
    value += 0x6D2B79F5
    let result = value
    result = Math.imul(result ^ result >>> 15, result | 1)
    result ^= result + Math.imul(result ^ result >>> 7, result | 61)
    return ((result ^ result >>> 14) >>> 0) / 4294967296
  }
}

export function getNightActivityOptions(cycle, day, marketSeed = 0) {
  const fixed = NIGHT_ACTIVITIES.convenienceJob
  if (cycle <= 1) return [fixed]

  const candidates = Object.values(NIGHT_ACTIVITIES)
    .filter((activity) => !activity.fixed && !activity.requiresHackingDeck && activity.unlockCycle <= cycle)
  const random = seededRandom(hashSeed(`${marketSeed}:${cycle}:${day}:night-activities`))
  const shuffled = [...candidates]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  const countRange = cycle >= 4 ? [3, 4] : [1, 2]
  const randomCount = Math.min(shuffled.length, random() < 0.5 ? countRange[0] : countRange[1])
  return [fixed, ...shuffled.slice(0, randomCount)]
}

export function getNightActivity(activityId) {
  return Object.values(NIGHT_ACTIVITIES).find((activity) => activity.id === activityId)
}
