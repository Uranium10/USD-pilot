const companies = [
  ['오비탈 레일', '궤도 건설', 128],
  ['리본 안드로이드', '폐기물 재활용', 84],
  ['셀레네 드릴', '우주 광물', 156],
  ['네뷸라 바이오', '바이오', 102],
  ['아레스 다이내믹스', '군수', 191],
]

const headlines = {
  up: ['대형 계약을 따냈다', '예상 밖의 흑자를 발표했다', '신기술 시험에 성공했다'],
  down: ['회계 드론이 탈주했다', '핵심 시설이 가동을 멈췄다', '규제국의 압수수색을 받았다'],
}

const round = (value) => Math.round(value * 100) / 100
const pick = (items, random) => items[Math.floor(random() * items.length)]

function seeded(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function makePath(startPrice, random) {
  const points = [{ progress: 0, price: startPrice }]
  let price = startPrice
  for (let index = 1; index <= 12; index += 1) {
    const shock = random() < 0.14 ? (random() - 0.5) * 0.16 : 0
    price = Math.max(8, price * (1 + (random() - 0.48) * 0.055 + shock))
    points.push({ progress: index / 12, price: round(price) })
  }
  return points
}

export function generateMarketCycle({ cycle = 1, seed = Date.now() } = {}) {
  const random = seeded(Number(seed) + cycle * 7919)
  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const stocks = companies.map(([name, sector, base], stockIndex) => {
      const startPrice = round(base * (1 + (cycle - 1) * 0.025 + (random() - 0.5) * 0.18))
      return {
        id: `stock-${stockIndex + 1}`,
        name,
        sector,
        startPrice,
        path: makePath(startPrice, random),
      }
    })
    const news = Array.from({ length: 5 }, (_, index) => {
      const stock = stocks[Math.floor(random() * stocks.length)]
      const direction = random() > 0.48 ? 'up' : 'down'
      return {
        id: `c${cycle}-d${dayIndex + 1}-n${index}`,
        progress: round(0.12 + index * 0.17 + random() * 0.08),
        stockId: stock.id,
        direction,
        text: `${stock.name}, ${pick(headlines[direction], random)}.`,
      }
    })
    const rumors = Array.from({ length: 3 }, (_, index) => {
      const stock = stocks[(index + dayIndex) % stocks.length]
      const wentUp = stock.path.at(-1).price >= stock.startPrice
      const accuracy = round(0.58 + random() * 0.32)
      const truthful = random() <= accuracy
      const predictedUp = truthful ? wentUp : !wentUp
      return {
        id: `c${cycle}-d${dayIndex + 1}-r${index}`,
        stockId: stock.id,
        direction: predictedUp ? 'up' : 'down',
        cost: Math.round(250 + accuracy * 900),
        accuracy,
        text: `${stock.name}의 오늘 종가는 ${predictedUp ? '오른다' : '내린다'}.`,
      }
    })
    return { day: dayIndex + 1, stocks, news, rumors }
  })

  return {
    cycle,
    seed,
    repayment: Math.round(14000 * 1.24 ** (cycle - 1)),
    interestRate: 0.24,
    days,
  }
}

