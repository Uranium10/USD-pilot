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
    '[단독] 대규모 궤도 조달 사업 우선협상대상자 최종 선정',
    '시장 기대치 대폭 상회... 깜짝 어닝 서프라이즈 발표',
    '핵심 특허 분쟁 최종 승소... "독점권 확보 쾌거"',
    '업계 거물급 인사 영입 소식에 주가 상승세',
    '차세대 프로젝트 베타 테스트 성공적 마무리',
    '초대형 벤처 자금 유치 성공... "성장 동력 확보"',
    '신규 우주항 인프라 독점 운영권 획득',
    '경영진, 대규모 자사주 매입 및 소각 기습 발표',
    '비용 구조 혁신 성공... 영업이익률 수직 상승',
    '소행성대 개척 진출 본격화... 대형 합작 법인 설립',
    '주력 상품 판매량 전년 대비 300% 폭증',
    '정부 규제 완화 최대 수혜주 지목... 매수세 집중',
    '신기술 시연회 대성공... 업계 표준 판도 바꾼다',
    '글로벌 우주 재벌과의 대형 공급 계약 체결 공시',
    '친환경 공정 도입으로 탄소세 면제 특혜 발동',
    '경쟁사 인수합병(M&A) 초읽기... 업계 1위 굳힌다',
    '정부 지원금 수령 확정... 재무 구조 대폭 개선',
    '소비자 만족도 1위 달성... 브랜드 가치 역대 최고점',
    '차세대 AI 시스템 도입으로 생산성 400% 향상 기대',
    '지구-화성 간 무역 협정 타결... 관세 철폐 수혜 톡톡',
    '희귀 광물 독점 채굴권 확보... 원가 절감 돌파구',
    '기관 투자자 대규모 매집 포착... 긍정적 전망 확산',
    '주주 친화적 특별 배당 검토 소식에 투자 심리 호전',
    '노조 파업 극적 타결... 생산 라인 정상 가동 돌입'
  ],
  down: [
    '경영진 비자금 조성 의혹... 당국 고강도 내사 착수',
    '영업이익 반토막 쇼크... 시장 전망치 크게 하회',
    '안전 규정 위반 적발... 주요 시설 가동 중단 명령',
    '최대 주주 대규모 블록딜 포착... 투심 차갑게 얼어붙어',
    '신제품 치명적 결함 발견... 전량 리콜 사태 직면',
    '경쟁사 혁신 신기술 발표에 시장 점유율 급락 우려',
    '기대 모았던 인수합병(M&A) 최종 결렬... 실망 매물 쏟아져',
    '핵심 데이터베이스 랜섬웨어 피격... 업무 전면 마비',
    '노조 무기한 총파업 선언... 주요 생산 라인 올스톱',
    '유해 물질 검출 논란 확산... 대규모 집단 소송 예고',
    '천문학적 우발 채무 발생... 재무 건전성 적신호',
    '주요 납품처 파산 보호 신청... 거액 매출 채권 회수 불투명',
    '정부의 기습적인 독과점 규제 발표... 직격탄 맞나',
    '차세대 프로젝트 핵심 임원진 줄사퇴... 내부 균열 가시화',
    '분식회계 의혹 불거져... 외부 감사인 "의견 거절" 검토',
    '환경 파괴 논란으로 글로벌 ESG 펀드 투자 철회 통보',
    '공장 폭발 사고 발생... 인명 피해 및 조업 중단 장기화',
    '주력 상품 발암 물질 함유 논란... 불매 운동 확산 조짐',
    '경쟁 심화로 인한 단가 후려치기... 수익성 악화 일로',
    '특허 침해 소송 1심 패소... 막대한 배상금 위기',
    '대형 스폰서십 계약 파기... 브랜드 이미지 심각한 타격',
    '달 궤도 식민지 정전 사태로 서버 데이터 대량 유실',
    '궤도 해적의 물류선 약탈 피해... 보안 시스템 구멍 논란',
    '원자재 가격 폭등에 생산 원가 감당 불능 사태'
  ],
}

const coinHeadlines = {
  up: [
    '외곽 정거장 결제망, 더스트 코인 준비자산 전격 채택',
    '대형 거래소 콜드월렛 물량 급감... 매수 심리 자극',
    '채굴 난이도 조정 후 신규 공급량 예상 밖 큰 폭 축소',
    '화성 자유항, 세금 납부 수단으로 시험 도입 공식 발표',
    '전설적 트레이더의 롱 포지션 공개... 시장 투심 환호',
    '반감기 임박 소문 확산... 희소성 부각에 급등세',
    '글로벌 결제 대행사, 더스트 코인 연동 서비스 출시',
    '제도권 금융사들의 암호자산 펀드 승인 임박 소식'
  ],
  down: [
    '주요 거래소 연쇄 출금 지연 사태... 유동성 고갈 우려',
    '익명 개발자 지갑서 대규모 물량 시장 이동 포착',
    '채굴 프로토콜 중복 지급 취약점 폭로... 신뢰도 타격',
    '궤도 금융감독원, 고위험 암호자산 전면 거래 제한 예고',
    '다크웹 최대 마켓 폐쇄... 더스트 코인 수요처 증발',
    '양자 컴퓨터에 의한 암호 체계 해킹 가능성 대두',
    '각국 정부의 합동 자금 세탁 조사 타겟으로 지목',
    '대규모 마이닝 풀 서버 다운... 해시레이트 급락'
  ],
}

const rumorSources = ['익명 해커의 데이터랩', '뒷골목 정보상', '고위 임원의 비서', '블랙마켓 찌라시', '궤도 관제소 첩보', '퇴사한 수석 엔지니어', '화성 탐사선 통신 감청', '사설탐정 사무소 보고서', '어둠의 다크웹 포럼', '소행성대 밀수업자']

const rumorEvents = [
  {
    up: ['화성-포보스 노선 여객 운송 독점권 확보 임박', '차세대 자기부상 궤도 기술 실증 테스트 조기 통과', '신규 궤도 엘리베이터 건설 예산 정부 심사 통과', '대형 물류사와의 장기 운송 계약 체결 유력'],
    down: ['신설 궤도 구간에서 구조 결함 발견... 전면 재검사 시작', '우주항 규제국, 건설 입찰 담합 혐의로 서버 압수수색', '궤도 파편 충돌로 주요 노선 일주일간 전면 통제 예정', '핵심 설계 엔지니어들의 경쟁사 단체 이직 소문'],
  },
  {
    up: ['군용 안드로이드 재활용 계약 우선협상대상자 선정', '폐기 코어 희귀 연산소자 회수 공정 상용화 성공', '고철 폐기물에서 신소재 추출하는 특허 출원 예정', '정부 주도 대규모 친환경 재활용 펀드 지원금 확보'],
    down: ['재활용 안드로이드의 기억 데이터 외부 대량 유출', '중앙 폐기장 자율기계 노조 무기한 점거 농성 시작', '폐기물 처리 과정에서 방사능 오염 물질 무단 방류 의혹', '주요 부품 재활용 공정에서 심각한 안전사고 발생'],
  },
  {
    up: ['세레스 광구 고순도 헬륨-3 광맥 대규모 확인', '채굴 드론 연료 소비 절반으로 줄이는 펌웨어 검증', '희토류 대체 가능한 신규 광물 추출 기술 개발 성공', '소행성 벨트 신규 탐사선 발사 임박... 대박 기대감'],
    down: ['주력 소행성 광구 채굴권 갱신 무기한 보류', '무인 채굴선단 태양폭풍으로 관제망 완전 이탈', '불법 채굴 혐의로 우주 환경 기구의 대규모 벌금 부과', '핵심 굴착 장비 결함으로 생산량 30% 급감'],
  },
  {
    up: ['저중력 골손실 치료제 임상시험 유의미한 결과 도출', '장기 동면용 세포 안정제 긴급 사용 승인 신청', '수명 연장 텔로미어 활성화 물질 특허 획득', '심우주 방사선 변이 대항용 신종 백신 개발 선두'],
    down: ['주력 배양 장기에서 원인 불명 치명적 변이 발견', '임상 데이터 조작 주장하는 내부 고발 문서 온라인 유포', '신약 부작용으로 인한 임상 참가자 집단 소송 위기', '연구소 내 생물재해 발생으로 시설 전면 폐쇄'],
  },
  {
    up: ['외곽 식민지 방위체계 교체 사업 단독 공급자 지명', '신형 요격 드론 실전 모의시험 목표 100% 격추', '차세대 전자기 펄스 무기 양산 체제 돌입', '지구 연합군 궤도 무기 체계 업그레이드 수주'],
    down: ['신형 요격 드론 민간 위성 오인 추적 사실 은폐 논란', '전쟁범죄 조사위원회 무기 수출 기록 강제 제출 명령', '무기 제어 소프트웨어 해킹으로 시제품 탈취 발생', '핵심 폭발물 원료 공급처 화재로 생산 차질'],
  },
  {
    up: ['달 궤도 태양광 집광망 첫 상업 송전 대성공', '노후 핵융합 발전소 대체할 장기 전력 계약 체결', '무선 전력 전송 거리 기록 2배 이상 경신', '초고효율 미니 원자로 기동 소형화 성공 임박'],
    down: ['집광 위성군 냉각 장치 결함으로 송전 효율 급락', '에너지 규제국 독점 요금 산정 방식 강도 높은 조사', '주력 발전소 원인 불명 셧다운으로 대규모 정전 유발', '불법 에너지 탈취꾼들에 의한 송전망 심각한 손상'],
  },
  {
    up: ['라그랑주 항로 긴급 화물 운송권 단독 확보', '무인 화물선 회항 시간 절반 단축 관제 체계 공개', '무인 화물 드론 초고속 대기권 진입 기술 시연', '대규모 궤도 해적 소탕 작전 지원으로 신뢰도 급상승'],
    down: ['주력 화물선단 항법 오류로 소행성대 발 묶여', '밀수 화물 은폐 의혹 주요 우주항 운항 허가 정지', '초대형 화물선 엔진 폭발로 적재물 전량 손실', '화물 터미널 파업 장기화로 운송 지연 배상금 눈덩이'],
  },
  {
    up: ['화성 개척지용 퀀텀 통신 중계망 구축 사업 수주', '태양폭풍 속 연결 유지 신규 프로토콜 완벽 검증', '지구-화성 간 통신 딜레이 0.1초 미만 달성', '경쟁사 대비 10배 빠른 위성 인터넷 상용화 예고'],
    down: ['통신 중계 위성 대규모 개인정보 유출 흔적 발견', '경쟁사 무료 통신망 개방 유료 가입자 대거 이탈', '통신 암호화 키 해킹으로 주요 정부 기관 데이터 노출', '통신 위성 궤도 이탈로 서비스 권역 블랙아웃'],
  },
  {
    up: ['화성 농업 돔 장기 배양식 공급 독점 계약 체결', '저중력 환경 식감 유지 단백질 배양 기술 공개', '완전 합성 유기농 식단 궤도 정거장 표준 식량 채택', '신개념 우주 수경재배법으로 수확량 500% 증가'],
    down: ['주력 배양육 허용치 3배 초과 중금속 검출', '곡물 합성 공장 미생물 오염 전 제품 강제 회수', '식량 배급망 해킹으로 재고 데이터 조작 스캔들', '인공 조미료 치명적 알러지 유발 논란 확산'],
  },
  {
    up: ['궤도 금융망 침해 완벽 방어... 정부 보안 계약 획득', '양자 내성 암호 모듈 군 통신 최고 보안 인증 통과', '차세대 블록체인 기반 보안 솔루션 업계 표준 채택', '최대 경쟁 보안업체 전격 인수합병 발표 임박'],
    down: ['자사 보안 관제망 내부자 백도어에 무참히 뚫려', '랜섬웨어 협상 대행 과정 불법 송금 의혹 제기', '최신 보안 패치 적용 후 전 세계 시스템 먹통 사태', '해커 집단에 역해킹 당해 소스 코드 다크웹 유출'],
  },
  {
    up: ['달 뒷면 전망 최고급 호텔 예약 개장 전 매진', '저중력 레저 복합 시설 국제 안전 인증 최고 등급 획득', '초호화 지구 궤도 크루즈 첫 항해 성황리에 마무리', '가상현실 결합한 신개념 궤도 관광 패키지 대히트'],
    down: ['관광 셔틀 산소 공급 사고 전 노선 운항 무기한 중단', '고가 패키지 환불 사태 발발 단기 유동성 위기', '우주 리조트 내 전염병 창궐로 2주간 전면 봉쇄', '미확인 우주 쓰레기 충돌 위험으로 주요 관광 루트 폐쇄 조치'],
  },
  {
    up: ['차세대 항법 칩 수율 90% 달성... 대량 납품 시작', '극저온 퀀텀 프로세서 기존 최고 연산 기록 경신', '인공지능 특화 뉴로모픽 반도체 상용화 앞당겨', '태양계 최대 전자기기 제조사와 독점 공급 계약'],
    down: ['핵심 웨이퍼 공정 오염 발생 생산 라인 전면 가동 중단', '설계 도면 유출 경쟁사 동급 칩 먼저 헐값에 공개', '신형 칩셋 과열 문제로 기기 발화 사고 연이어 발생', '핵심 원자재 공급망 붕괴로 생산 단가 3배 폭등'],
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
