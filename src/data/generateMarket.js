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

const rumorSources = ['익명 해커의 데이터랩', '뒷골목 정보상', '고위 임원의 비서', '블랙마켓 찌라시', '궤도 관제소 첩보']

const rumorEvents = [
  {
    up: ['화성-포보스 화물선로의 독점 건설권을 낙찰받았다.', '궤도 엘리베이터 안전성 검사를 예정보다 일찍 통과했다.'],
    down: ['신설 궤도 구간에서 구조 결함이 발견돼 전면 재검사가 시작됐다.', '우주항 규제국이 건설 입찰 담합 혐의로 서버를 압수했다.'],
  },
  {
    up: ['군용 안드로이드 재활용 계약의 우선협상대상자로 선정됐다.', '폐기 코어에서 희귀 연산소자를 회수하는 공정을 상용화했다.'],
    down: ['재활용 안드로이드의 기억 데이터가 외부로 유출됐다.', '중앙 폐기장에서 자율기계 노조의 무기한 점거가 시작됐다.'],
  },
  {
    up: ['세레스 광구에서 고순도 헬륨-3 광맥을 확인했다.', '채굴 드론의 연료 소비를 절반으로 줄이는 펌웨어를 검증했다.'],
    down: ['주력 소행성 광구의 채굴권 갱신이 보류됐다.', '무인 채굴선단이 태양폭풍으로 관제망에서 이탈했다.'],
  },
  {
    up: ['저중력 골손실 치료제의 임상시험에서 유의미한 결과가 나왔다.', '장기 동면용 세포 안정제의 긴급 사용 승인을 신청했다.'],
    down: ['주력 배양 장기에서 원인 불명의 변이가 발견됐다.', '임상 데이터 조작을 주장하는 내부 고발 문서가 공개됐다.'],
  },
  {
    up: ['외곽 식민지 방위체계 교체 사업의 단독 공급자로 지명됐다.', '신형 요격 드론이 실전 모의시험에서 목표를 전부 격추했다.'],
    down: ['신형 요격 드론이 민간 위성을 오인 추적한 사실이 드러났다.', '전쟁범죄 조사위원회가 무기 수출 기록 제출을 명령했다.'],
  },
]

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
      const eventDirection = predictedUp ? 'up' : 'down'
      const stockEvents = rumorEvents[Number(stock.id.split('-')[1]) - 1]
      return {
        id: `c${cycle}-d${dayIndex + 1}-r${index}`,
        stockId: stock.id,
        direction: predictedUp ? 'up' : 'down',
        cost: Math.round(250 + accuracy * 900),
        accuracy,
        source: pick(rumorSources, random),
        text: `${stock.name}: ${pick(stockEvents[eventDirection], random)}`,
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
