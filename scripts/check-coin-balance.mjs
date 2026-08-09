import {
  COIN_ASSET_ID,
  COIN_DAILY_MAX_MULTIPLIER,
  COIN_DAILY_MIN_MULTIPLIER,
  COIN_REFERENCE_PRICE,
  COIN_SEGMENT_MOVE_LIMIT,
  DAYS_PER_CYCLE,
  DAY_DURATION_SECONDS,
  FLOOR_BY_CYCLE,
  JOB_REWARD,
  LISTED_COMPANY_COUNT,
  MARKET_ASSET_COUNT,
  MAX_MINE_TIER_BY_CYCLE,
  STOCK_DAILY_MAX_MULTIPLIER,
  STOCK_DAILY_MIN_MULTIPLIER,
  STOCK_SEGMENT_MOVE_LIMIT,
  SISYPHUS_STOCK_ID,
  SISYPHUS_EPILOGUE_TARGET_PRICE,
} from '../src/config.js'
import { generateMarketCycle } from '../src/data/generateMarket.js'
import { minePaybackSeconds, mineRate, mineUpgradeCost } from '../src/logic/miningSystem.js'
import { useGameStore } from '../src/store/gameStore.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const average = (values) => values.reduce((total, value) => total + value, 0) / values.length
const quantile = (values, ratio) => [...values].sort((left, right) => left - right)[Math.floor(values.length * ratio)]
const weekSeconds = DAY_DURATION_SECONDS * DAYS_PER_CYCLE

assert(DAY_DURATION_SECONDS === 480, '낮 스테이지는 8분(480초)이어야 합니다.')
assert(LISTED_COMPANY_COUNT === 5 && MARKET_ASSET_COUNT === 7, '시장 구성은 기업 5 + 코인 1 + 시지프 인텔리전스 1이어야 합니다.')
assert(STOCK_SEGMENT_MOVE_LIMIT === 0.36, '주식 구간 변동 상한은 ±36%여야 합니다.')

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
assert(coverageRows[0].coverage <= 0.32, '1주차 안전망 수입이 최소 상환액의 32%를 넘습니다.')
assert(coverageRows.every((row, index) => index === 0 || row.coverage <= coverageRows[index - 1].coverage), '주차가 지날수록 안전망 커버율이 낮아져야 합니다.')

const stockRanges = []
const stockSegmentMoves = []
const stockDailyReturns = []
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
    assert(day.stocks.at(-2)?.id === SISYPHUS_STOCK_ID && day.stocks.at(-1)?.id === COIN_ASSET_ID, '시지프는 더스트 코인 바로 위에 표시되어야 합니다.')
    assert(day.news.every((item) => day.stocks.some((asset) => asset.id === item.stockId)), '상장되지 않은 회사의 뉴스가 생성됐습니다.')
    assert(day.news.some((item) => item.stockId === SISYPHUS_STOCK_ID), '시지프 전용 뉴스가 없습니다.')
    assert(day.rumors.some((item) => item.stockId === SISYPHUS_STOCK_ID), '시지프 전용 정보가 없습니다.')
    for (const asset of day.stocks) {
      const prices = asset.path.map((point) => point.price)
      const range = (Math.max(...prices) - Math.min(...prices)) / asset.startPrice
      if (asset.assetType === 'coin') {
        coinRanges.push(range)
        assert(Math.min(...prices) >= asset.startPrice * (COIN_DAILY_MIN_MULTIPLIER - 0.001), '코인 일중 하락 제한을 벗어났습니다.')
        assert(Math.max(...prices) <= asset.startPrice * (COIN_DAILY_MAX_MULTIPLIER + 0.001), '코인 일중 상승 제한을 벗어났습니다.')
      } else {
        stockRanges.push(range)
        stockDailyReturns.push(asset.path.at(-1).price / asset.startPrice - 1)
        assert(Math.min(...prices) >= asset.startPrice * (STOCK_DAILY_MIN_MULTIPLIER - 0.001), '주식 일중 하락 제한을 벗어났습니다.')
        assert(Math.max(...prices) <= asset.startPrice * (STOCK_DAILY_MAX_MULTIPLIER + 0.001), '주식 일중 상승 제한을 벗어났습니다.')
        for (let index = 1; index < prices.length; index += 1) {
          stockSegmentMoves.push(Math.abs(prices[index] / prices[index - 1] - 1))
        }
      }
    }
  }
  finalCoinPrices.push(market.days.at(-1).stocks.find((asset) => asset.id === COIN_ASSET_ID).path.at(-1).price)
}

const lateStockRanges = []
const lateStockSegmentMoves = []
const lateStockDailyReturns = []
const lateCoinRanges = []
for (let seed = 1; seed <= 300; seed += 1) {
  const market = generateMarketCycle({ cycle: 6, seed })
  for (const day of market.days) {
    for (const asset of day.stocks) {
      const prices = asset.path.map((point) => point.price)
      const range = (Math.max(...prices) - Math.min(...prices)) / asset.startPrice
      if (asset.assetType === 'coin') {
        lateCoinRanges.push(range)
        continue
      }
      lateStockRanges.push(range)
      lateStockDailyReturns.push(asset.path.at(-1).price / asset.startPrice - 1)
      for (let index = 1; index < prices.length; index += 1) {
        lateStockSegmentMoves.push(Math.abs(prices[index] / prices[index - 1] - 1))
      }
    }
  }
}

assert(selectedCompanyIds.size === 12, `기업 풀 일부가 선택되지 않았습니다: ${selectedCompanyIds.size}/12`)
assert(Math.max(...stockSegmentMoves) <= STOCK_SEGMENT_MOVE_LIMIT + 0.001, '주식 구간 변동이 ±36% 상한을 벗어났습니다.')
assert(quantile(stockSegmentMoves, 0.5) < 0.04, '가우시안 분포의 중앙 구간이 지나치게 큽니다.')
assert(quantile(stockSegmentMoves, 0.95) >= 0.08, '가우시안 혼합분포의 꼬리가 충분히 넓지 않습니다.')
assert(quantile(stockSegmentMoves, 0.99) >= 0.16, '상위 1% 주식 변동이 충분히 크지 않습니다.')
assert(Math.abs(average(stockDailyReturns)) <= 0.03, '주식 가격 경로에 과도한 상승/하락 편향이 있습니다.')
assert(Math.max(...lateStockSegmentMoves) <= STOCK_SEGMENT_MOVE_LIMIT + 0.001, '6주차 주식 구간 변동이 ±36% 상한을 벗어났습니다.')
assert(quantile(lateStockSegmentMoves, 0.99) >= 0.22, '6주차 상위 1% 주식 변동이 충분히 크지 않습니다.')
assert(Math.abs(average(lateStockDailyReturns)) <= 0.04, '6주차 주식 경로에 과도한 상승/하락 편향이 있습니다.')
const volatilityRatio = average(coinRanges) / average(stockRanges)
const lateVolatilityRatio = average(lateCoinRanges) / average(lateStockRanges)
assert(volatilityRatio >= 2, `코인 변동성이 충분히 크지 않습니다: ${volatilityRatio.toFixed(2)}배`)
assert(lateVolatilityRatio >= 1.8, `6주차 코인 변동성이 충분히 크지 않습니다: ${lateVolatilityRatio.toFixed(2)}배`)
assert(COIN_SEGMENT_MOVE_LIMIT === 0.45, '코인 구간 변동 상한은 ±45%여야 합니다.')
assert(average(finalCoinPrices) >= 212.5 && average(finalCoinPrices) <= 287.5, '코인 가격에 과도한 장기 방향 편향이 있습니다.')

// 채굴기를 초반에 설치하고 DUST를 7주차까지 보유하는 전략의 장기 보상을 검증한다.
// 매 주차 마지막 종가를 다음 주차 시작가로 넘겨 실제 게임과 같은 연속 경로를 만든다.
const longHoldMultiples = []
for (let seed = 1; seed <= 300; seed += 1) {
  let coinPrice = COIN_REFERENCE_PRICE
  let companyIds
  for (let cycle = 1; cycle <= 7; cycle += 1) {
    const market = generateMarketCycle({ cycle, seed: seed * 100 + cycle, companyIds, coinStartPrice: coinPrice })
    companyIds = market.companyIds
    coinPrice = market.days.at(-1).stocks.find((asset) => asset.id === COIN_ASSET_ID).path.at(-1).price
  }
  longHoldMultiples.push(coinPrice / COIN_REFERENCE_PRICE)
}
const longHoldMedian = quantile(longHoldMultiples, 0.5)
const longHoldLowerDecile = quantile(longHoldMultiples, 0.1)
const longHoldWinRate = longHoldMultiples.filter((multiple) => multiple > 1).length / longHoldMultiples.length
assert(longHoldMedian >= 1.8, `7주 장기 보유 중앙값이 1.8배 미만입니다: ${longHoldMedian.toFixed(2)}배`)
assert(longHoldLowerDecile >= 1.1, `7주 장기 보유 하위 10%가 원금 대비 10% 상승에 못 미칩니다: ${longHoldLowerDecile.toFixed(2)}배`)
assert(longHoldWinRate >= 0.9, `7주 장기 보유 상승 확률이 90% 미만입니다: ${(longHoldWinRate * 100).toFixed(1)}%`)

const tradeTestMarket = generateMarketCycle({ cycle: 1, seed: 777 })
useGameStore.getState().loadMarket(tradeTestMarket)
useGameStore.getState().completeDayIntro()
useGameStore.getState().startDay()
useGameStore.setState({ miningTier: 0, cash: 100000 })
useGameStore.getState().buy(COIN_ASSET_ID, 1)
assert(!useGameStore.getState().holdings[COIN_ASSET_ID], 'DUST는 시장에서 매수할 수 없어야 합니다.')

const epilogueMarket = generateMarketCycle({ cycle: 7, seed: 777, companyIds: tradeTestMarket.companyIds })
const epilogueSisyphus = epilogueMarket.days[0].stocks.find((asset) => asset.id === SISYPHUS_STOCK_ID)
assert(epilogueSisyphus.path.at(-1).price <= SISYPHUS_EPILOGUE_TARGET_PRICE * 1.2, '7주차 시지프 종가가 매집 가능 가격까지 폭락하지 않았습니다.')
assert(epilogueMarket.days[0].news.some((item) => item.id === 'c7-d1-sisyphus-collapse'), '7주차 시지프 대폭락 뉴스가 없습니다.')

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
console.log(`주식 구간 절대변동 P50/P95/P99 = ${(quantile(stockSegmentMoves, 0.5) * 100).toFixed(2)}% / ${(quantile(stockSegmentMoves, 0.95) * 100).toFixed(2)}% / ${(quantile(stockSegmentMoves, 0.99) * 100).toFixed(2)}%`)
console.log(`주식 일간 평균 수익률 = ${(average(stockDailyReturns) * 100).toFixed(2)}%`)
console.log(`6주차 코인/주식 일중 변동폭 = ${lateVolatilityRatio.toFixed(2)}배, 주식 P99 = ${(quantile(lateStockSegmentMoves, 0.99) * 100).toFixed(2)}%`)
console.log(`500개 시드 1주 종료 코인 평균가: ₡${average(finalCoinPrices).toFixed(2)}`)
console.log(`300개 시드 7주 장기 보유: 중앙값 ${longHoldMedian.toFixed(2)}배 · 하위 10% ${longHoldLowerDecile.toFixed(2)}배 · 상승 확률 ${(longHoldWinRate * 100).toFixed(1)}%`)
