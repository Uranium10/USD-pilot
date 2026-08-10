import { generateMarketCycle, getStockPathProfile } from '../src/data/generateMarket.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

function sample(cycle, day) {
  const moves = []
  const pointCounts = []
  for (let seed = 1; seed <= 400; seed += 1) {
    const market = generateMarketCycle({ cycle, seed })
    const assets = market.days[day - 1].stocks.filter((asset) => asset.assetType === 'company')
    for (const asset of assets) {
      pointCounts.push(asset.path.length)
      for (let index = 1; index < asset.path.length; index += 1) {
        moves.push(Math.abs(asset.path[index].price / asset.path[index - 1].price - 1))
      }
    }
  }
  return {
    cycle,
    day,
    factor: getStockPathProfile(cycle, day).jaggedness,
    points: average(pointCounts),
    move: average(moves),
  }
}

const rows = [sample(1, 1), sample(1, 2), sample(1, 3), sample(1, 4), sample(1, 7), sample(2, 7), sample(3, 1)]
const [week1Day1, week1Day2, week1Day3, week1Day4, week1Day7, week2Day7, week3Day1] = rows

assert(week1Day1.factor <= 0.08 && week1Day2.factor <= 0.1, '1주차 첫 이틀의 경로가 충분히 평탄하지 않습니다.')
assert(week1Day2.factor < week1Day3.factor && week1Day3.factor < week1Day4.factor, '3~4일차부터 경로 강도가 증가하지 않습니다.')
assert(week1Day4.factor < week1Day7.factor, '1주차 후반 경로 강도가 날짜에 따라 증가하지 않습니다.')
assert(week1Day7.factor < week2Day7.factor && week2Day7.factor < week3Day1.factor, '3주차까지 경로 강도가 점진적으로 증가하지 않습니다.')
assert(week3Day1.factor === 1, '3주차부터 기존 경로 강도에 도달해야 합니다.')
assert(week1Day1.points < week3Day1.points, '1주차 1일차의 변곡점 수가 충분히 적지 않습니다.')
assert(week1Day2.move < week1Day3.move && week1Day3.move < week1Day7.move && week1Day7.move < week3Day1.move, '실측 구간 변동이 의도한 순서로 증가하지 않습니다.')

console.table(rows.map((row) => ({
  period: `${row.cycle}주차 ${row.day}일차`,
  strength: row.factor.toFixed(3),
  'avg points': row.points.toFixed(2),
  'avg segment move': `${(row.move * 100).toFixed(2)}%`,
})))
