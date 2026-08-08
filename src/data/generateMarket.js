import { DAY_DURATION_SECONDS } from '../config.js'

const companies = [
  ['오비탈 레일', '궤도 건설', 128],
  ['리본 안드로이드', '폐기물 재활용', 84],
  ['셀레네 드릴', '우주 광물', 156],
  ['네뷸라 바이오', '바이오', 102],
  ['아레스 다이내믹스', '군수', 191],
]

const headlines = {
  up: [
    '대규모 궤도 조달 사업의 우선협상대상자로 선정되었다',
    '어닝 서프라이즈를 기록하며 시장 기대치를 크게 상회했다',
    '핵심 기술 특허 소송에서 최종 승소했다',
    '업계 거물급 인사 영입 소식에 투자자 기대감이 고조되고 있다',
    '차세대 프로젝트의 베타 테스트를 성공적으로 마무리했다',
    '대형 벤처 캐피탈로부터 천문학적 규모의 자금을 유치했다',
    '신규 우주항 인프라 독점 운영권을 확보했다',
    '공격적인 자사주 매입 및 소각 계획을 기습 발표했다',
    '비용 구조 혁신에 성공하며 영업이익률이 급등했다',
    '외곽 항성계 진출을 위한 대형 조인트 벤처를 설립했다',
    '주력 상품의 판매량이 전년 대비 300% 폭증했다',
    '정부의 대규모 규제 완화 수혜주로 지목되며 매수세가 몰리고 있다'
  ],
  down: [
    '경영진의 비자금 조성 의혹으로 당국의 강도 높은 내사에 착수했다',
    '분기 어닝 쇼크를 기록하며 영업이익이 반토막 났다',
    '안전 규정 위반으로 주요 시설의 무기한 가동 중단 명령을 받았다',
    '최대 주주의 대규모 블록딜 소식에 투자 심리가 차갑게 얼어붙었다',
    '신제품에서 치명적인 결함이 발견되어 전량 리콜 사태에 직면했다',
    '경쟁사의 혁신 신기술 발표로 인해 심각한 시장 점유율 하락이 우려된다',
    '인수합병(M&A) 협상이 최종 결렬되며 실망 매물이 쏟아지고 있다',
    '핵심 데이터베이스가 랜섬웨어 공격을 받아 궤도 업무가 전면 마비되었다',
    '노조의 무기한 총파업 선언으로 주요 생산 라인이 멈춰섰다',
    '유해 물질 검출 논란으로 소비자들의 대규모 집단 소송에 직면했다',
    '예상치 못한 천문학적인 우발 채무가 장부에 반영되었다',
    '주요 납품처의 파산으로 거액의 매출 채권을 떼일 위기에 처했다'
  ],
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
  const pointCount = 4 + Math.floor(random() * 5)
  const progresses = Array.from({ length: pointCount - 2 }, () => 0.05 + random() * 0.9)
    .sort((left, right) => left - right)
  const points = [{ progress: 0, price: startPrice }]
  let price = startPrice
  for (const progress of [...progresses, 1]) {
    const shock = random() < 0.14 ? (random() - 0.5) * 0.32 : 0
    price = Math.max(8, price * (1 + (random() - 0.48) * 0.11 + shock))
    points.push({ progress: round(progress), price: round(price) })
  }
  return points
}

export function generateMarketCycle({ cycle = 1, seed = Date.now() } = {}) {
  const random = seeded(Number(seed) + cycle * 7919)
  const previousCloses = companies.map(([, , base]) => base * (1 + (cycle - 1) * 0.025))
  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const stocks = companies.map(([name, sector, base], stockIndex) => {
      const referencePrice = dayIndex === 0 ? base * (1 + (cycle - 1) * 0.025) : previousCloses[stockIndex]
      const startPrice = round(referencePrice * (1 + (random() - 0.5) * 0.025))
      const stock = {
        id: `stock-${stockIndex + 1}`,
        name,
        sector,
        startPrice,
        path: makePath(startPrice, random),
      }
      previousCloses[stockIndex] = stock.path.at(-1).price
      return stock
    })
    const news = Array.from({ length: 5 }, (_, index) => {
      const stock = stocks[Math.floor(random() * stocks.length)]
      const impactIndex = 1 + Math.floor(random() * (stock.path.length - 1))
      const impactPoint = stock.path[impactIndex]
      const previousPoint = stock.path[impactIndex - 1]
      const direction = impactPoint.price >= previousPoint.price ? 'up' : 'down'
      const offsetSeconds = -90 + random() * 120
      const progress = Math.min(0.99, Math.max(0.01, impactPoint.progress + offsetSeconds / DAY_DURATION_SECONDS))
      return {
        id: `c${cycle}-d${dayIndex + 1}-n${index}`,
        progress: round(progress),
        impactProgress: impactPoint.progress,
        stockId: stock.id,
        direction,
        text: `${stock.name}, ${pick(headlines[direction], random)}.`,
      }
    }).sort((left, right) => left.progress - right.progress)
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
