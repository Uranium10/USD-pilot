import {
  COIN_ASSET_ID,
  COIN_REFERENCE_PRICE,
  DAYS_PER_CYCLE,
  DAY_DURATION_SECONDS,
  FLOOR_BY_CYCLE,
  JOB_REWARD,
  LISTED_COMPANY_COUNT,
  MARKET_ASSET_COUNT,
  MAX_MINE_TIER_BY_CYCLE,
} from '../src/config.js'
import { generateMarketCycle } from '../src/data/generateMarket.js'
import { minePaybackSeconds, mineRate, mineUpgradeCost } from '../src/logic/miningSystem.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const average = (values) => values.reduce((total, value) => total + value, 0) / values.length
const weekSeconds = DAY_DURATION_SECONDS * DAYS_PER_CYCLE

assert(DAY_DURATION_SECONDS === 720, '낮 스테이지는 12분(720초)이어야 합니다.')
assert(LISTED_COMPANY_COUNT === 5 && MARKET_ASSET_COUNT === 6, '시장 구성은 기업 5 + 코인 1이어야 합니다.')

let cumulativeCost = 0
const tierRows = []
for (let tier = 0; tier <= 6; tier += 1) {
  const cost = mineUpgradeCost(tier - 1)
  cumulativeCost += cost
  const coinsPerWeek = mineRate(tier) * weekSeconds
  const paybackDays = minePaybackSeconds(tier - 1, COIN_REFERENCE_PRICE) / DAY_DURATION_SECONDS
  tierRows.push({ tier, cost, cumulativeCost, coinsPerWeek, paybackDays })
}
assert(cumulativeCost === 13205, `T.6 누적 비용이 예상과 다릅니다: ${cumulativeCost}`)
assert(tierRows.every((row) => row.paybackDays >= 16 && row.paybackDays <= 34), '업그레이드 회수 기간이 16~34거래일 범위를 벗어났습니다.')

const coverageRows = FLOOR_BY_CYCLE.map((floor, index) => {
  const tier = MAX_MINE_TIER_BY_CYCLE[index]
  const miningValue = mineRate(tier) * weekSeconds * COIN_REFERENCE_PRICE
  const totalFloorIncome = miningValue + JOB_REWARD * DAYS_PER_CYCLE
  return { cycle: index + 1, tier, floor, totalFloorIncome, coverage: totalFloorIncome / floor }
})
assert(coverageRows[0].coverage <= 0.31, '1주차 안전망 수입이 최소 상환액의 31%를 넘습니다.')
assert(coverageRows.every((row, index) => index === 0 || row.coverage <= coverageRows[index - 1].coverage), '주차가 지날수록 안전망 커버율이 낮아져야 합니다.')

const stockRanges = []
const coinRanges = []
const finalCoinPrices = []
const selectedCompanyIds = new Set()
for (let seed = 1; seed <= 500; seed += 1) {
  const market = generateMarketCycle({ cycle: 1, seed })
  assert(market.companyIds.length === LISTED_COMPANY_COUNT, '회사 명단 개수가 잘못됐습니다.')
  market.companyIds.forEach((companyId) => selectedCompanyIds.add(companyId))
  for (const day of market.days) {
    assert(day.stocks.length === MARKET_ASSET_COUNT, '하루 시장 자산 개수가 잘못됐습니다.')
    const coin = day.stocks.find((asset) => asset.id === COIN_ASSET_ID)
    assert(coin?.assetType === 'coin', '코인 자산이 없습니다.')
    for (const asset of day.stocks) {
      const prices = asset.path.map((point) => point.price)
      const range = (Math.max(...prices) - Math.min(...prices)) / asset.startPrice
      if (asset.assetType === 'coin') {
        coinRanges.push(range)
        assert(Math.min(...prices) >= asset.startPrice * 0.549, '코인 일중 하락 제한을 벗어났습니다.')
        assert(Math.max(...prices) <= asset.startPrice * 1.451, '코인 일중 상승 제한을 벗어났습니다.')
      } else {
        stockRanges.push(range)
      }
    }
  }
  finalCoinPrices.push(market.days.at(-1).stocks.find((asset) => asset.id === COIN_ASSET_ID).path.at(-1).price)
}
assert(selectedCompanyIds.size === 12, `기업 풀 일부가 선택되지 않았습니다: ${selectedCompanyIds.size}/12`)
const volatilityRatio = average(coinRanges) / average(stockRanges)
assert(volatilityRatio >= 2, `코인 변동성이 충분히 크지 않습니다: ${volatilityRatio.toFixed(2)}배`)
assert(average(finalCoinPrices) >= 85 && average(finalCoinPrices) <= 115, '코인 가격에 과도한 장기 방향 편향이 있습니다.')

console.table(tierRows.map((row) => ({
  tier: `T.${row.tier}`,
  cost: Math.round(row.cost),
  cumulative: Math.round(row.cumulativeCost),
  'coin/week': row.coinsPerWeek.toFixed(3),
  'payback days': row.paybackDays.toFixed(1),
})))
console.table(coverageRows.map((row) => ({
  cycle: row.cycle,
  'tier cap': `T.${row.tier}`,
  'job+mining': Math.round(row.totalFloorIncome),
  floor: row.floor,
  coverage: `${(row.coverage * 100).toFixed(1)}%`,
})))
console.log(`500개 시드 평균 일중 변동폭: 코인/주식 = ${volatilityRatio.toFixed(2)}배`)
console.log(`500개 시드 1주 종료 코인 평균가: ₡${average(finalCoinPrices).toFixed(2)}`)
