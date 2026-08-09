import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'

const STEPS = [
  {
    tag: '01 / 생존 조건',
    title: '매주 빚을 갚아야 합니다.',
    body: '한 주는 7일입니다. 우측 상단의 총부채와 주간 목표 상환액을 항상 확인하세요. 최소 상환액을 마련하지 못하면 즉시 게임 오버입니다.',
    screen: 'market',
    target: 'debt',
  },
  {
    tag: '02 / 정보 거래소',
    title: '장 시작 전에 정보를 고릅니다.',
    body: '정보는 여러 개를 선택해 한꺼번에 구입할 수 있습니다. 비쌀수록 대체로 정확하지만, 모든 정보가 사실인 것은 아닙니다.',
    screen: 'info',
    target: 'rumors',
  },
  {
    tag: '03 / 주식 거래',
    title: '8분 동안 사고팔 수 있습니다.',
    body: '왼쪽에서 종목을 고르고, 차트 아래에서 수량을 입력한 뒤 매수·매도하세요. 장이 닫히기 전에 주간 상환에 쓸 현금도 남겨야 합니다.',
    screen: 'market',
    target: 'trade',
  },
  {
    tag: '04 / 뉴스와 정보 모음',
    title: '정보는 시장에서 검증됩니다.',
    body: '오른쪽 LIVE WIRE에서 실제 사건을 확인하세요. 구입한 정보는 작업 표시줄의 정보 모음에서 다시 볼 수 있고, 적중하면 완료 표시가 붙습니다.',
    screen: 'market',
    target: 'news',
  },
  {
    tag: '05 / 밤 활동',
    title: '마감 뒤에는 방으로 돌아옵니다.',
    body: '밤에는 시간이 흐르지 않습니다. 아르바이트, 채굴기와 장비 구입을 마친 뒤 직접 하루를 종료하세요. DUST는 채굴해서 판매할 수만 있습니다.',
    screen: 'night',
    target: 'night',
  },
]

function AccountStrip({ target }) {
  return <section className="tutorial-account-strip">
    <div><small>총자산</small><strong>₡12,500</strong></div>
    <div><small>현금</small><strong>₡12,500</strong></div>
    <div><small>마이닝 OFFLINE</small><strong className="cyan">0.0000 DUST</strong></div>
    <div className={target === 'debt' ? 'tutorial-focus' : ''}><small>총 부채</small><strong className="red">₡165,000</strong></div>
    <div className={target === 'debt' ? 'tutorial-focus' : ''}><small>주간 목표 상환액</small><strong className="red">₡20,000</strong></div>
  </section>
}

function MarketMock({ target }) {
  return <div className="tutorial-desktop">
    <section className="tutorial-window">
      <header className="tutorial-titlebar"><b>U.S.D Market Terminal</b><span>장 마감 8:00　— □ ×</span></header>
      <AccountStrip target={target} />
      <div className="tutorial-market-grid">
        <aside className="tutorial-stock-list">
          {['네뷸라 바이오', '아레스 다이내믹스', '퀀텀 포지', '헬리오스 그리드', '시지프 인텔리전스'].map((name, index) => <div key={name} className={index === 1 ? 'selected' : ''}><span><b>{name}</b><small>{index === 4 ? '메가코프' : '상장 기업'}</small></span><strong>₡{96 + index * 13}</strong></div>)}
        </aside>
        <section className={`tutorial-chart ${target === 'trade' ? 'tutorial-focus' : ''}`}>
          <header><span><small>우주 식량</small><b>아레스 다이내믹스</b></span><strong>₡109</strong></header>
          <div className="tutorial-chart-lines"><i /><i /><i /><svg viewBox="0 0 600 150" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,110 70,95 130,112 190,44 250,70 320,62 390,102 460,80 530,95 600,38" /></svg></div>
          <div className="tutorial-order"><span>보유 0주</span><div><button>+1</button><button>+5</button><button>+10</button><label>수량 <input value="10" readOnly /></label><button className="buy">매수</button><button className="sell">매도</button></div></div>
        </section>
        <aside className={`tutorial-news ${target === 'news' ? 'tutorial-focus' : ''}`}><h3>LIVE WIRE</h3><article><small>10:18 · 아레스 다이내믹스</small><p>신규 궤도 식량 공급 계약 체결.</p></article><article><small>09:42 · 퀀텀 포지</small><p>차세대 합금 생산 라인 공개.</p></article></aside>
      </div>
    </section>
    <footer className={target === 'news' ? 'tutorial-taskbar tutorial-focus' : 'tutorial-taskbar'}><button>◐ 절전</button><button>▥ U.S.D Market Terminal</button><button>▤ 정보 모음.txt</button><span>1주차 1/7일　09:00</span></footer>
  </div>
}

function InfoMock() {
  return <div className="tutorial-info-screen">
    <p>WEEK 1 · DAY 1 · 정보 거래소</p><h2>정보를 구입하세요.</h2>
    <div className="tutorial-rumors tutorial-focus">{['궤도 산업 내부자', '항만 통신 감청', '기업 연구원 제보', '암시장 브로커'].map((source, index) => <article key={source}><span>{index === 1 ? '구매 선택됨' : '암호화된 정보'}</span><b>출처: {source}</b><small>내용 및 신뢰도 미상 · ₡{450 + index * 150}</small></article>)}</div>
    <footer><span>선택 1건 (₡600)</span><button>선택 정보 구입</button><button>구입 완료</button></footer>
  </div>
}

function NightMock() {
  return <div className="tutorial-night-screen">
    <img src="/imgs/bg/Tarae/room_night_1.png" alt="타래의 밤 방" />
    <section className="tutorial-night-panel tutorial-focus"><p>NIGHT SHIFT</p><h2>오늘 밤 무엇을 할까?</h2><div><button>아르바이트<br /><small>활동력 1 · 확정 수입</small></button><button>암시장 상점<br /><small>채굴기와 장비 구입</small></button></div><button className="sleep">하루 종료</button></section>
  </div>
}

export default function TutorialOverlay() {
  const completeTutorial = useGameStore((state) => state.completeTutorial)
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  useEffect(() => setStepIndex(0), [])

  const next = () => stepIndex < STEPS.length - 1 ? setStepIndex((index) => index + 1) : completeTutorial()

  return <section className="tutorial-backdrop" aria-label="게임 튜토리얼">
    <button type="button" className="tutorial-overlay-skip" onClick={completeTutorial}>튜토리얼 건너뛰기</button>
    <div className="tutorial-demo" aria-hidden="true">
      {step.screen === 'market' && <MarketMock target={step.target} />}
      {step.screen === 'info' && <InfoMock />}
      {step.screen === 'night' && <NightMock />}
    </div>
    <article className={`tutorial-coach tutorial-coach-${step.target}`}>
      <header><span>{step.tag}</span><strong>{stepIndex + 1} / {STEPS.length}</strong></header>
      <h2>{step.title}</h2><p>{step.body}</p>
      <footer><button type="button" onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0}>이전</button><div>{STEPS.map((_, index) => <i key={index} className={index <= stepIndex ? 'active' : ''} />)}</div><button type="button" className="primary" onClick={next}>{stepIndex === STEPS.length - 1 ? '첫날 시작' : '다음'}</button></footer>
    </article>
  </section>
}
