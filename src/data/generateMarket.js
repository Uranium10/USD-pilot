import {
  COIN_ASSET_ID,
  COIN_REFERENCE_PRICE,
  COIN_VOLATILITY_BY_CYCLE,
  DAY_DURATION_SECONDS,
  DAYS_PER_CYCLE,
  INFO_COST_MULTIPLIER,
  LISTED_COMPANY_COUNT,
  STOCK_BASE_SIGMA,
  STOCK_DAILY_MAX_MULTIPLIER,
  STOCK_DAILY_MIN_MULTIPLIER,
  STOCK_SEGMENT_MOVE_LIMIT,
  STOCK_SHOCK_CHANCE,
  STOCK_SHOCK_SIGMA,
  VOLATILITY_BY_CYCLE,
} from '../config.js'

const companies = [
  ['오비탈 레일', '궤도 건설', 128, 'orbital-rail'],
  ['리본 안드로이드', '폐기물 재활용', 84, 'reborn-android'],
  ['셀레네 드릴', '우주 광물', 156, 'selene-drill'],
  ['네뷸라 바이오', '바이오', 102, 'nebula-bio'],
  ['아레스 다이내믹스', '군수', 191, 'ares-dynamics'],
  ['헬리오스 그리드', '우주 에너지', 117, 'helios-grid'],
  ['크레이터 로지스틱스', '우주 물류', 73, 'crater-logistics'],
  ['제니스 네트워크', '궤도 통신', 139, 'zenith-network'],
  ['타이탄 푸드랩', '우주 식량', 92, 'titan-foodlab'],
  ['폴라리스 시큐리티', '사이버 보안', 168, 'polaris-security'],
  ['이오니아 리조트', '우주 관광', 61, 'ionia-resort'],
  ['퀀텀 포지', '양자 반도체', 145, 'quantum-forge'],
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

const coinHeadlines = {
  up: [
    '외곽 정거장 결제망이 준비자산으로 채택했다',
    '대형 거래소의 콜드월렛 보유량이 급감하며 매수세가 몰렸다',
    '채굴 난이도 조정 이후 신규 공급량이 예상보다 크게 줄었다',
    '화성 자유항이 세금 납부 수단으로 시험 도입한다고 발표했다',
  ],
  down: [
    '주요 거래소의 출금 지연으로 유동성 우려가 번졌다',
    '익명 개발자 지갑에서 대규모 물량이 시장으로 이동했다',
    '채굴 프로토콜의 중복 지급 취약점이 공개됐다',
    '궤도 금융감독원이 고위험 암호자산 거래 제한을 예고했다',
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
  {
    up: ['수성 궤도 태양광 집광망의 첫 상업 송전에 성공했다.', '노후 핵융합 발전소를 대체할 장기 전력 계약을 체결했다.'],
    down: ['집광 위성군의 냉각 장치 결함으로 송전 효율이 급락했다.', '에너지 규제국이 독점 요금 산정 방식에 대한 조사를 시작했다.'],
  },
  {
    up: ['라그랑주 항로의 긴급 화물 운송권을 단독으로 확보했다.', '무인 화물선의 회항 시간을 절반으로 줄인 관제 체계를 공개했다.'],
    down: ['주력 화물선단이 항법 오류로 소행성대에 발이 묶였다.', '밀수 화물 은폐 의혹으로 주요 우주항의 운항 허가가 정지됐다.'],
  },
  {
    up: ['외곽 식민지용 양자 통신 중계망 구축 사업을 수주했다.', '태양폭풍 속에서도 연결을 유지하는 신규 프로토콜을 검증했다.'],
    down: ['통신 중계 위성에서 대규모 개인정보 유출 흔적이 발견됐다.', '경쟁사의 무료 통신망 개방으로 유료 가입자가 급감하고 있다.'],
  },
  {
    up: ['화성 농업 돔에 장기 배양식 공급 계약을 체결했다.', '저중력 환경에서 식감이 유지되는 단백질 배양 기술을 공개했다.'],
    down: ['주력 배양육에서 허용치를 넘는 중금속이 검출됐다.', '곡물 합성 공장의 미생물 오염으로 전 제품 회수가 시작됐다.'],
  },
  {
    up: ['궤도 금융망 침해를 막아 정부 보안 계약을 따냈다.', '양자 내성 암호 모듈이 군 통신 보안 인증을 통과했다.'],
    down: ['자사 보안 관제망이 내부자의 백도어에 뚫린 사실이 드러났다.', '랜섬웨어 협상 대행 과정에서 불법 송금 의혹이 제기됐다.'],
  },
  {
    up: ['토성 고리 전망 호텔의 예약이 개장 전에 매진됐다.', '무중력 레저 시설이 국제 안전 인증을 획득했다.'],
    down: ['관광 셔틀의 산소 공급 사고로 전 노선 운항이 중단됐다.', '고가 패키지 환불 사태로 단기 유동성 위기가 불거졌다.'],
  },
  {
    up: ['차세대 항법 칩의 수율을 크게 개선해 대량 납품을 시작했다.', '극저온 양자 프로세서가 기존 연산 기록을 경신했다.'],
    down: ['핵심 웨이퍼 공정의 오염으로 생산 라인이 멈췄다.', '설계 도면 유출로 경쟁사가 동급 칩을 먼저 공개했다.'],
  },
]

const round = (value) => Math.round(value * 100) / 100
const pick = (items, random) => items[Math.floor(random() * items.length)]
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function seeded(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function gaussian(random) {
  let first = 0
  let second = 0
  while (first === 0) first = random()
  while (second === 0) second = random()
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second)
}

const companyIndexById = new Map(companies.map((company, index) => [company[3], index]))

function selectCompanies(random, companyIds) {
  const requested = Array.isArray(companyIds) ? [...new Set(companyIds)] : []
  if (requested.length === LISTED_COMPANY_COUNT && requested.every((id) => companyIndexById.has(id))) {
    return requested.map((id) => companies[companyIndexById.get(id)])
  }
  const shuffled = [...companies]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled.slice(0, LISTED_COMPANY_COUNT)
}

function makePath(startPrice, random, cycle) {
  const volatility = VOLATILITY_BY_CYCLE[cycle - 1] ?? VOLATILITY_BY_CYCLE.at(-1)
  const pointCount = 4 + Math.floor(random() * 5)
  const progresses = Array.from({ length: pointCount - 2 }, () => 0.05 + random() * 0.9)
    .sort((left, right) => left - right)
  const points = [{ progress: 0, price: startPrice }]
  let price = startPrice
  for (const progress of [...progresses, 1]) {
    const normalMove = gaussian(random) * STOCK_BASE_SIGMA * volatility
    const shock = random() < STOCK_SHOCK_CHANCE
      ? gaussian(random) * STOCK_SHOCK_SIGMA * Math.sqrt(volatility)
      : 0
    const move = clamp(normalMove + shock, -STOCK_SEGMENT_MOVE_LIMIT, STOCK_SEGMENT_MOVE_LIMIT)
    price = clamp(
      price * (1 + move),
      Math.max(8, startPrice * STOCK_DAILY_MIN_MULTIPLIER),
      startPrice * STOCK_DAILY_MAX_MULTIPLIER,
    )
    points.push({ progress: round(progress), price: round(price) })
  }
  return points
}

function makeCoinPath(startPrice, random, cycle) {
  const volatility = COIN_VOLATILITY_BY_CYCLE[cycle - 1] ?? COIN_VOLATILITY_BY_CYCLE.at(-1)
  const pointCount = 8 + Math.floor(random() * 5)
  const progresses = Array.from({ length: pointCount - 2 }, () => 0.04 + random() * 0.92).sort((left, right) => left - right)
  const points = [{ progress: 0, price: startPrice }]
  let price = startPrice

  for (const progress of [...progresses, 1]) {
    const meanReversion = clamp(Math.log(COIN_REFERENCE_PRICE / price) * 0.16, -0.1, 0.1)
    const normalMove = (random() - 0.5) * 0.28 * volatility
    const shock = random() < 0.22 ? (random() - 0.5) * 0.58 * Math.sqrt(volatility) : 0
    const move = clamp(meanReversion + normalMove + shock, -0.35, 0.35)
    price = clamp(price * (1 + move), startPrice * 0.55, startPrice * 1.45)
    price = clamp(price, COIN_REFERENCE_PRICE * 0.25, COIN_REFERENCE_PRICE * 4)
    points.push({ progress: round(progress), price: round(price) })
  }
  return points
}

export function generateMarketCycle({ cycle = 1, seed = Date.now(), companyIds, coinStartPrice } = {}) {
  const random = seeded(Number(seed) + cycle * 7919)
  const listedCompanies = selectCompanies(random, companyIds)
  const listedCompanyIds = listedCompanies.map((company) => company[3])
  const previousCloses = listedCompanies.map(([, , base]) => base * (1 + (cycle - 1) * 0.025))
  const requestedCoinStart = Number(coinStartPrice)
  let previousCoinClose = Number.isFinite(requestedCoinStart)
    ? clamp(requestedCoinStart, COIN_REFERENCE_PRICE * 0.25, COIN_REFERENCE_PRICE * 4)
    : COIN_REFERENCE_PRICE
  const days = Array.from({ length: DAYS_PER_CYCLE }, (_, dayIndex) => {
    const companyStocks = listedCompanies.map(([name, sector, base, companyId], stockIndex) => {
      const referencePrice = dayIndex === 0 ? base * (1 + (cycle - 1) * 0.025) : previousCloses[stockIndex]
      const startPrice = round(referencePrice * (1 + (random() - 0.5) * 0.025))
      const stock = {
        id: `stock-${stockIndex + 1}`,
        assetType: 'company',
        companyId,
        name,
        sector,
        startPrice,
        path: makePath(startPrice, random, cycle),
      }
      previousCloses[stockIndex] = stock.path.at(-1).price
      return stock
    })
    const coinStart = round(clamp(previousCoinClose * (1 + (random() - 0.5) * 0.08), COIN_REFERENCE_PRICE * 0.25, COIN_REFERENCE_PRICE * 4))
    const coin = {
      id: COIN_ASSET_ID,
      assetType: 'coin',
      symbol: 'DUST',
      name: '더스트 코인',
      sector: '고변동 암호자산',
      startPrice: coinStart,
      path: makeCoinPath(coinStart, random, cycle),
    }
    previousCoinClose = coin.path.at(-1).price
    const stocks = [...companyStocks, coin]
    const newsTargets = [
      ...Array.from({ length: 4 }, () => companyStocks[Math.floor(random() * companyStocks.length)]),
      coin,
    ]
    const news = newsTargets.map((stock, index) => {
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
        text: `${stock.name}, ${pick(stock.assetType === 'coin' ? coinHeadlines[direction] : headlines[direction], random)}.`,
      }
    }).sort((left, right) => left.progress - right.progress)
    const rumors = Array.from({ length: 3 }, (_, index) => {
      const stock = companyStocks[(index + dayIndex) % companyStocks.length]
      const wentUp = stock.path.at(-1).price >= stock.startPrice
      const accuracy = round(0.58 + random() * 0.32)
      const truthful = random() <= accuracy
      const predictedUp = truthful ? wentUp : !wentUp
      const eventDirection = predictedUp ? 'up' : 'down'
      const stockEvents = rumorEvents[companyIndexById.get(stock.companyId)]
      return {
        id: `c${cycle}-d${dayIndex + 1}-r${index}`,
        stockId: stock.id,
        direction: predictedUp ? 'up' : 'down',
        cost: Math.round((100 + accuracy * 350) * (INFO_COST_MULTIPLIER[cycle - 1] ?? INFO_COST_MULTIPLIER.at(-1))),
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
    companyIds: listedCompanyIds,
    days,
  }
}
