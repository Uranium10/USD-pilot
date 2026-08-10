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
import { getMinPayment } from '../src/logic/debtSystem.js'
import { generateMarketCycle, injectMarketNoise } from '../src/data/generateMarket.js'
import { informationCost } from '../src/logic/informationEconomy.js'
import { minePaybackSeconds, mineRate, mineUpgradeCost } from '../src/logic/miningSystem.js'
import { useGameStore } from '../src/store/gameStore.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const average = (values) => values.reduce((total, value) => total + value, 0) / values.length
const quantile = (values, ratio) => [...values].sort((left, right) => left - right)[Math.floor(values.length * ratio)]
const weekSeconds = DAY_DURATION_SECONDS * DAYS_PER_CYCLE

assert(DAY_DURATION_SECONDS === 240, '낮 스테이지는 4분(240초)이어야 합니다.')
assert(FLOOR_BY_CYCLE.join(',') === '18000,23000,29000,39000,53000,71000', '주차별 최소 상환 하한이 ₡1,000씩 완화되지 않았습니다.')
assert(getMinPayment(165000, 1) === 18800, '부채 비례분이 적용되는 1주차도 기존보다 ₡1,000 낮아야 합니다.')
// 하루 길이를 절반으로 줄이면서 채굴 레이트를 2배로 올려 하루/주차당 경제 규모를 보존했다.
// 이 두 값은 항상 함께 움직여야 하므로 곱을 직접 검증한다(T.0 기준 하루 ₡180).
assert(
  Math.abs(mineRate(0) * DAY_DURATION_SECONDS * COIN_REFERENCE_PRICE - 180) < 0.01,
  `T.0 하루 채굴 수입이 ₡180이 아닙니다: ₡${(mineRate(0) * DAY_DURATION_SECONDS * COIN_REFERENCE_PRICE).toFixed(2)}`,
)
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
assert(coverageRows[0].coverage <= 0.34, '1주차 안전망 수입이 완화된 최소 상환액의 34%를 넘습니다.')
assert(coverageRows.every((row, index) => index === 0 || row.coverage <= coverageRows[index - 1].coverage), '주차가 지날수록 안전망 커버율이 낮아져야 합니다.')

const stockRanges = []
const stockSegmentMoves = []
const stockDailyReturns = []
const coinRanges = []
const finalCoinPrices = []
const selectedCompanyIds = new Set()
for (let seed = 1; seed <= 500; seed += 1) {
  const market = generateMarketCycle({ cycle: 1, seed })
  const sisyphusRumorDays = []
  assert(market.companyIds.length === LISTED_COMPANY_COUNT, '회사 명단 개수가 잘못됐습니다.')
  market.companyIds.forEach((companyId) => selectedCompanyIds.add(companyId))
  for (const day of market.days) {
    assert(day.stocks.length === MARKET_ASSET_COUNT, '하루 시장 자산 개수가 잘못됐습니다.')
    const coin = day.stocks.find((asset) => asset.id === COIN_ASSET_ID)
    assert(coin?.assetType === 'coin', '코인 자산이 없습니다.')
    assert(day.stocks.at(-2)?.id === SISYPHUS_STOCK_ID && day.stocks.at(-1)?.id === COIN_ASSET_ID, '시지프는 더스트 코인 바로 위에 표시되어야 합니다.')
    assert(day.news.every((item) => day.stocks.some((asset) => asset.id === item.stockId)), '상장되지 않은 회사의 뉴스가 생성됐습니다.')
    assert(day.news.some((item) => item.stockId === SISYPHUS_STOCK_ID), '시지프 전용 뉴스가 없습니다.')
    assert(day.rumors.length === 3, '정보 거래소는 항상 정보 카드 3개를 제공해야 합니다.')
    for (const rumor of day.rumors) {
      assert(Number.isFinite(rumor.expectedImpact) && rumor.expectedImpact >= 0, '정보에 내부 예상 충격량이 없습니다.')
      if (rumor.stockId !== SISYPHUS_STOCK_ID) {
        assert(rumor.cost === informationCost({ accuracy: rumor.accuracy, expectedImpact: rumor.expectedImpact, cycle: market.cycle }), '정보 가격이 신뢰도·충격량·주차와 일치하지 않습니다.')
      }
    }
    if (day.rumors.some((item) => item.stockId === SISYPHUS_STOCK_ID)) sisyphusRumorDays.push(day.day)
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
  assert(sisyphusRumorDays[0] >= 2 && sisyphusRumorDays[0] <= 4, '첫 시지프 정보가 2~4일차 사이에 등장하지 않았습니다.')
  for (let index = 1; index < sisyphusRumorDays.length; index += 1) {
    const interval = sisyphusRumorDays[index] - sisyphusRumorDays[index - 1]
    assert(interval >= 2 && interval <= 4, '시지프 정보의 등장 간격이 2~4일을 벗어났습니다.')
  }
  finalCoinPrices.push(market.days.at(-1).stocks.find((asset) => asset.id === COIN_ASSET_ID).path.at(-1).price)
}

const lateStockRanges = []
const lateStockSegmentMoves = []
const lateStockDailyReturns = []
const lateCoinRanges = []
const matureStockSegmentMoves = []
const matureStockDailyReturns = []
for (let seed = 1; seed <= 300; seed += 1) {
  const matureMarket = generateMarketCycle({ cycle: 3, seed })
  for (const day of matureMarket.days) {
    for (const asset of day.stocks.filter((item) => item.assetType === 'company')) {
      const prices = asset.path.map((point) => point.price)
      matureStockDailyReturns.push(asset.path.at(-1).price / asset.startPrice - 1)
      for (let index = 1; index < prices.length; index += 1) {
        matureStockSegmentMoves.push(Math.abs(prices[index] / prices[index - 1] - 1))
      }
    }
  }

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
assert(quantile(stockSegmentMoves, 0.5) < quantile(matureStockSegmentMoves, 0.5), '1주차가 3주차보다 완만하지 않습니다.')
assert(quantile(matureStockSegmentMoves, 0.5) < 0.04, '3주차 가우시안 분포의 중앙 구간이 지나치게 큽니다.')
assert(quantile(matureStockSegmentMoves, 0.95) >= 0.08, '3주차 가우시안 혼합분포의 꼬리가 충분히 넓지 않습니다.')
assert(quantile(matureStockSegmentMoves, 0.99) >= 0.16, '3주차 상위 1% 주식 변동이 충분히 크지 않습니다.')
assert(Math.abs(average(matureStockDailyReturns)) <= 0.03, '3주차 주식 가격 경로에 과도한 상승/하락 편향이 있습니다.')
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
const jaggedMarket = injectMarketNoise(structuredClone(tradeTestMarket))
const jaggedVariationRatios = []
let jaggedDirectionChanges = 0
let jaggedDirectionComparisons = 0
for (let dayIndex = 0; dayIndex < jaggedMarket.days.length; dayIndex += 1) {
  for (let stockIndex = 0; stockIndex < jaggedMarket.days[dayIndex].stocks.length; stockIndex += 1) {
    const coarseStock = tradeTestMarket.days[dayIndex].stocks[stockIndex]
    const jaggedStock = jaggedMarket.days[dayIndex].stocks[stockIndex]
    const coarseVariation = coarseStock.path.slice(1).reduce(
      (total, point, index) => total + Math.abs(point.price - coarseStock.path[index].price),
      0,
    )
    const jaggedVariation = jaggedStock.path.slice(1).reduce(
      (total, point, index) => total + Math.abs(point.price - jaggedStock.path[index].price),
      0,
    )
    if (coarseVariation > 0) jaggedVariationRatios.push(jaggedVariation / coarseVariation)

    assert(jaggedStock.path.length >= 190, '랜덤워크 표본 밀도가 하루 190개 미만입니다.')
    assert(
      jaggedStock.path.every((point, index) => index === 0 || point.progress > jaggedStock.path[index - 1].progress),
      '랜덤워크 시간축이 엄격히 증가하지 않습니다.',
    )
    assert(jaggedStock.path[0].price === coarseStock.path[0].price, '랜덤워크가 시가를 변경했습니다.')
    assert(jaggedStock.path.at(-1).price === coarseStock.path.at(-1).price, '랜덤워크가 종가를 변경했습니다.')

    const priceFloor = jaggedStock.startPrice * (jaggedStock.assetType === 'coin' ? COIN_DAILY_MIN_MULTIPLIER : STOCK_DAILY_MIN_MULTIPLIER)
    const priceCeiling = jaggedStock.startPrice * (jaggedStock.assetType === 'coin' ? COIN_DAILY_MAX_MULTIPLIER : STOCK_DAILY_MAX_MULTIPLIER)
    assert(jaggedStock.path.every((point) => point.price >= priceFloor - 0.01 && point.price <= priceCeiling + 0.01), '랜덤워크가 일중 가격 제한을 벗어났습니다.')

    const moves = jaggedStock.path.slice(1)
      .map((point, index) => point.price - jaggedStock.path[index].price)
      .filter(Boolean)
    for (let index = 1; index < moves.length; index += 1) {
      jaggedDirectionComparisons += 1
      if (Math.sign(moves[index]) !== Math.sign(moves[index - 1])) jaggedDirectionChanges += 1
    }
  }
}
assert(average(jaggedVariationRatios) >= 3.5, '랜덤워크의 미세 변동이 충분히 선명하지 않습니다.')
assert(jaggedDirectionChanges / jaggedDirectionComparisons >= 0.44, '랜덤워크의 방향 전환이 충분히 빈번하지 않습니다.')

useGameStore.getState().loadMarket(tradeTestMarket)
useGameStore.getState().completeDayIntro()
useGameStore.getState().startDay()
useGameStore.setState({ miningTier: 0, cash: 100000 })
useGameStore.getState().buy(COIN_ASSET_ID, 1)
assert(!useGameStore.getState().holdings[COIN_ASSET_ID], 'DUST는 시장에서 매수할 수 없어야 합니다.')

// 최대 매수 버튼으로 수량을 채운 직후 가격이 오른 상황을 재현한다. 과거에는 10주 전체가
// 거절됐지만, 이제 체결 시점의 ₡1,000으로 살 수 있는 9주만 매수해야 한다.
const edgeStock = tradeTestMarket.days[0].stocks.find((asset) => asset.assetType === 'company')
useGameStore.setState({
  phase: 'day',
  cash: 1000,
  holdings: {},
  weeklyModifierId: null,
  currentPrices: { ...useGameStore.getState().currentPrices, [edgeStock.id]: 101 },
})
const edgeBuy = useGameStore.getState().buy(edgeStock.id, 10)
assert(edgeBuy?.quantity === 9, `가격 상승 후 최대 매수가 체결 가능 수량으로 줄지 않았습니다: ${edgeBuy?.quantity}`)
assert(useGameStore.getState().holdings[edgeStock.id]?.quantity === 9, '가격 상승 엣지케이스의 실제 보유 수량이 잘못됐습니다.')
assert(useGameStore.getState().cash === 91, `부분 체결 후 현금이 잘못됐습니다: ${useGameStore.getState().cash}`)

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
console.log(`1주차/3주차 주식 구간 P50 = ${(quantile(stockSegmentMoves, 0.5) * 100).toFixed(2)}% / ${(quantile(matureStockSegmentMoves, 0.5) * 100).toFixed(2)}%`)
console.log(`3주차 주식 구간 P95/P99 = ${(quantile(matureStockSegmentMoves, 0.95) * 100).toFixed(2)}% / ${(quantile(matureStockSegmentMoves, 0.99) * 100).toFixed(2)}%`)
console.log(`3주차 주식 일간 평균 수익률 = ${(average(matureStockDailyReturns) * 100).toFixed(2)}%`)
console.log(`6주차 코인/주식 일중 변동폭 = ${lateVolatilityRatio.toFixed(2)}배, 주식 P99 = ${(quantile(lateStockSegmentMoves, 0.99) * 100).toFixed(2)}%`)
console.log(`500개 시드 1주 종료 코인 평균가: ₡${average(finalCoinPrices).toFixed(2)}`)
console.log(`300개 시드 7주 장기 보유: 중앙값 ${longHoldMedian.toFixed(2)}배 · 하위 10% ${longHoldLowerDecile.toFixed(2)}배 · 상승 확률 ${(longHoldWinRate * 100).toFixed(1)}%`)
