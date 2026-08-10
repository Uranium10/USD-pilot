import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'

const STEPS = [
  {
    tag: '01 / 생존 조건',
    title: '매주 빚을 갚아야 합니다.',
    body: '우측 상단의 총부채와 주간 목표 상환액을 항상 확인하세요. 매 7일마다 상환액을 마련하지 못하면 즉시 게임 오버됩니다.',
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
    title: '4분의 낮 시간 동안 거래할 수 있습니다.',
    body: '왼쪽에서 종목을 고르고, 차트 아래에서 수량을 입력한 뒤 매수·매도하세요. 낮 시간이 끝나기 전에 주간 상환에 쓸 현금도 남겨야 합니다.',
    screen: 'market',
    target: 'trade',
  },
  {
    tag: '04 / 실시간 뉴스',
    title: '시장의 흐름을 파악하세요.',
    body: '오른쪽 LIVE WIRE에서 실시간 뉴스를 확인하세요. 시장에 영향을 미치는 주요 사건들이 이곳에 표시됩니다.',
    screen: 'market',
    target: 'news',
  },
  {
    tag: '05 / 정보 모음',
    title: '구입한 정보를 활용하세요.',
    body: '구입한 정보는 작업 표시줄의 정보 모음 창에서 다시 볼 수 있습니다. 뉴스가 발표되어 해당 정보가 사실로 드러나면 완료 표시가 붙습니다.',
    screen: 'notepad',
    target: 'info-document',
  },
  {
    tag: '06 / 밤 활동',
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
    <footer className={target === 'info-tab' ? 'tutorial-taskbar tutorial-focus' : 'tutorial-taskbar'}><button>◐ 절전</button><button>▥ U.S.D Market Terminal</button><button>▤ 정보 모음.txt</button><span>1주차 1/7일　09:00</span></footer>
  </div>
}

function InfoMock() {
  const rumors = [
    { source: '퇴사한 수석 엔지니어', cost: 352 },
    { source: '블랙마켓 찌라시', cost: 363, queued: true },
    { source: '소행성대 밀수업자', cost: 384 },
  ]
  return <section className="panel premarket tutorial-info-screen">
    <p>WEEK 1 · DAY 1 · 정보 거래소</p><h2>정보를 구입하세요.</h2>
    <div className="rumor-grid tutorial-static-focus">{rumors.map((rumor) => <button key={rumor.source} className={`rumor ${rumor.queued ? 'queued' : ''}`}><span>{rumor.queued ? '구매 선택됨' : '암호화된 정보'}</span><strong>출처: {rumor.source}</strong><small>내용 및 신뢰도 미상 · ₡{rumor.cost}</small></button>)}</div>
    <p className="purchase-summary">구입 0건 · 선택 1건 (₡363) · 남은 현금 ₡12,000</p>
    <div className="premarket-actions"><button className="primary">구입 완료</button></div>
  </section>
}

function NotepadMock() {
  return <div className="tutorial-desktop tutorial-notepad-desktop">
    <section className="desktop-window notepad-window tutorial-notepad-window tutorial-focus">
      <div className="notepad-tabbar"><span className="notepad-app-icon">▤</span><div className="notepad-tab"><b>정보 모음.txt</b><span>×</span></div><button className="new-tab">＋</button><div className="window-buttons"><button>—</button><button>□</button><button>×</button></div></div>
      <div className="notepad-commandbar"><div className="notepad-tools"><button><b>B</b></button><button><i>I</i></button><span className="tool-separator" /><button>A−</button><span className="font-size-value">16px</span><button>A＋</button></div></div>
      <div className="notepad-document">
        <section className="tutorial-information-example">
          <div>------------------------------</div><br />
          <div>[정보 1] 출처: 화성 탐사선 통신 감청 / 신뢰도: 61%</div>
          <div>“셀레네 드릴: 소행성 벨트 신규 탐사선 발사 임박... 대박 기대감”</div><br />
          <div>------------------------------</div><br />
          <div>------------------------------</div><br />
          <div>[정보 2] 출처: 어둠의 다크웹 포럼 / 신뢰도: 73% <b className="information-completed">(완료됨)</b></div>
          <div>“퀀텀 포지: 차세대 합병 절차 90% 달성... 대량 납품 시작”</div><br />
          <div>------------------------------</div>
        </section>
        <div className="notepad-editor editable-notes tutorial-note-placeholder">여기에 메모를 입력하세요...</div>
      </div>
      <footer className="notepad-statusbar"><span>줄 1, 열 1</span><span>184자</span><span className="status-spacer" /><span>일반 텍스트</span><span>100%</span><span>Windows (CRLF)</span><span>UTF-8</span></footer>
    </section>
    <footer className="taskbar tutorial-notepad-taskbar"><button className="shutdown">◐ 절전</button><button>▥ U.S.D Market Terminal</button><button className="active">▤ 정보 모음.txt</button><span>1주차 1/7일</span><time>09:04</time></footer>
  </div>
}

function NightMock() {
  return <div className="tutorial-night-screen">
    <img src="/imgs/bg/Tarae/room_night_1.png" alt="타래의 밤 방" />
    <header className="room-title"><b>U.S.D</b><span>UNPAID SPACE DEBT</span></header>
    <aside className="room-status"><b>1주차 · 1일차</b><span>현금 ₡12,500</span><span>총부채 ₡165,000</span><span>최소상환 ₡20,000</span></aside>
    <section className="night-desktop tutorial-night-desktop tutorial-static-focus">
      <header><div><p className="eyebrow">NIGHT SHIFT</p><h2>1주차 1일차 밤</h2></div><div className="energy-meter"><span>활동력 100/100</span><progress max="100" value="100" /></div></header>
      <nav className="night-tabs"><button className="active">활동</button><button>상점</button><button>인벤토리 (0)</button></nav>
      <div className="night-content">
        <article className="night-entry"><img src="/imgs/items/convenience_job.png" alt="" className="item-thumbnail" /><div><h3>편의점 아르바이트</h3><p>궤도 정거장 편의점의 야간 재고를 정리한다.</p><small className="night-meta"><span>활동력 -85</span><span className="night-meta-separator" aria-hidden="true">·</span><span className="credit-flow credit-income">수입 +₡600</span></small></div><button>일하러 가기</button></article>
      </div>
    </section>
    <button className="sleep-button tutorial-sleep-button">자기</button>
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
      {step.screen === 'notepad' && <NotepadMock />}
      {step.screen === 'night' && <NightMock />}
    </div>
    <article className={`tutorial-coach tutorial-coach-${step.target}`}>
      <header><span>{step.tag}</span><strong>{stepIndex + 1} / {STEPS.length}</strong></header>
      <h2>{step.title}</h2><p>{step.body}</p>
      <footer><button type="button" onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0}>이전</button><div>{STEPS.map((_, index) => <i key={index} className={index <= stepIndex ? 'active' : ''} />)}</div><button type="button" className="primary" onClick={next}>{stepIndex === STEPS.length - 1 ? '첫날 시작' : '다음'}</button></footer>
    </article>
  </section>
}
