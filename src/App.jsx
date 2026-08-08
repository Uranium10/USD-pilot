import { useEffect, useState } from 'react'
import './App.css'
import StockChart from './components/StockChart.jsx'
import { DAY_DURATION_SECONDS } from './config.js'
import { stageEngine } from './engine/StageEngine.js'
import { fetchMarketCycle } from './services/marketService.js'
import { getNetWorth, useGameStore } from './store/gameStore.js'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`
const subtitles = ['Upside Down', 'Useless Decision', 'Unpaid Space Debt', 'Urgent Sell Disaster']

function Title() {
  const beginLoading = useGameStore((state) => state.beginLoading)
  const loadMarket = useGameStore((state) => state.loadMarket)
  const [loading, setLoading] = useState(false)
  const start = async () => {
    setLoading(true); beginLoading()
    const market = await fetchMarketCycle(1)
    loadMarket(market)
  }
  return <main className="title-screen">
    <p className="eyebrow">DEBT SURVIVAL TERMINAL</p>
    <h1>U.S.D</h1>
    <p className="subtitle">{subtitles[Math.floor(Math.random() * subtitles.length)]}</p>
    <button className="primary large" onClick={start} disabled={loading}>{loading ? '시장 생성 중…' : '게임 시작'}</button>
  </main>
}

function Premarket() {
  const state = useGameStore()
  const [flashingRumorId, setFlashingRumorId] = useState(null)
  if (!state.market) return null
  const data = state.market.days[state.day - 1]
  const purchase = (rumor) => {
    if (!state.purchaseRumor(rumor)) return
    setFlashingRumorId(rumor.id)
    window.setTimeout(() => setFlashingRumorId(null), 450)
  }
  const completePurchase = () => state.showOverlay({ type: 'dayBriefing', title: `${state.day}일차 정보 브리핑` })
  return <section className="panel premarket">
    <p className="eyebrow">WEEK {state.cycle} · DAY {state.day} · 정보 거래소</p>
    <h2>필요한 정보를 구입하세요.</h2>
    <div className="rumor-grid">{data.rumors.map((rumor) => {
      const isPurchased = state.purchasedRumors.some((item) => item.id === rumor.id)
      return (
      <button key={rumor.id} className={`rumor ${isPurchased ? 'selected' : ''} ${flashingRumorId === rumor.id ? 'purchase-flash' : ''}`} onClick={() => purchase(rumor)} disabled={isPurchased || state.cash < rumor.cost}>
        <span>{isPurchased ? '구입됨' : '암호화된 정보'}</span>
        <strong>출처: {rumor.source}</strong>
        <small>내용 및 신뢰도 미상 · {money(rumor.cost)}</small>
      </button>
    )})}</div>
    <p className="purchase-summary">구입 {state.purchasedRumors.length}건 · 남은 현금 {money(state.cash)}</p>
    <button className="primary" onClick={completePurchase}>구입 완료</button>
  </section>
}

function Room() {
  const state = useGameStore()
  if (state.phase === 'loading') return <main className="room"><div className="character">◉_◉</div><p>궤도 시장을 도청하는 중…</p></main>
  return <main className="room">
    <div className="window"><span>NEO SEOUL // ORBIT 7</span></div>
    <div className="character"><div className="face">{state.phase === 'night' ? '－_－' : '◉_◉'}</div><small>채무자 #0810</small></div>
    <div className="desk">
      <button className="computer" onClick={() => state.setScreen('monitor')}><span>U.S.D TERMINAL</span><small>{state.phase === 'premarket' ? '오늘의 시장을 준비하세요' : '주식 장은 종료되었습니다'}</small></button>
    </div>
    <aside className="room-status"><b>{state.cycle}주차 · {state.day}일차</b><span>현금 {money(state.cash)}</span><span>상환액 {money(state.debt)}</span></aside>
    {state.phase === 'night' && <section className="night-card"><p className="eyebrow">NIGHT · 시간제한 없음</p><h2>오늘도 살아남았습니다.</h2><p>야간활동은 준비 중입니다. 준비가 끝났다면 다음 날로 넘어가세요.</p><button className="primary" onClick={state.endNight}>하루 종료</button></section>}
    {state.phase === 'settlement' && <Settlement />}
  </main>
}

function Settlement() {
  const state = useGameStore()
  const settle = async () => {
    const result = state.settleCycle()
    if (result?.result === 'next') state.loadNextCycle(await fetchMarketCycle(result.cycle))
  }
  return <section className="modal-card"><p className="eyebrow">WEEKLY COLLECTION</p><h2>7일이 지났습니다.</h2><p>현금 {money(state.cash)} / 상환액 {money(state.debt)}</p><button className="danger" onClick={settle}>{state.cash >= state.debt ? '빚을 갚는다' : '빈 지갑을 내민다'}</button></section>
}

function Monitor() {
  const state = useGameStore()
  const [quantity, setQuantity] = useState(1)
  if (!state.market) return null
  const data = state.market.days[state.day - 1]
  const selected = data.stocks.find((stock) => stock.id === state.selectedStockId) || data.stocks[0]
  const currentPrice = state.currentPrices[selected.id] || selected.startPrice
  const holding = state.holdings[selected.id] || { quantity: 0, average: 0 }
  const buyTotal = currentPrice * quantity
  const sellQuantity = Math.min(quantity, holding.quantity)
  const sellTotal = currentPrice * sellQuantity
  const canBuy = quantity > 0 && buyTotal <= state.cash
  const canSell = sellQuantity > 0
  const remaining = Math.max(0, DAY_DURATION_SECONDS - state.elapsed)
  const netWorth = getNetWorth(state)
  const previousSummary = state.dailySummaries.at(-1)
  const assetChange = previousSummary ? netWorth - previousSummary.netWorth : 0
  
  const profitDiff = holding.quantity > 0 ? (currentPrice - holding.average) : 0
  const profitPct = holding.quantity > 0 ? (profitDiff / holding.average) * 100 : 0
  
  const addQuantity = (add) => setQuantity((q) => Math.max(0, q + add))
  const setMaxBuy = () => setQuantity(Math.max(0, Math.floor(state.cash / currentPrice)))
  const setMaxSell = () => setQuantity(Math.max(0, holding.quantity))

  return <main className="monitor-shell">
    <header className="terminal-bar"><b>U.S.D // MARKET</b><span>{state.cycle}주차 {state.day}/7일 · 낮</span><span className={remaining < 60 ? 'red' : ''}>{Math.floor(remaining / 60)}:{String(Math.floor(remaining % 60)).padStart(2, '0')}</span><button onClick={() => state.showOverlay({ type: 'purchasedInfo', title: '구입한 정보' })}>구입 정보 {state.purchasedRumors.length}</button><button onClick={() => state.showOverlay({ title: '거래 안내', text: '낮 동안에는 시간이 흐릅니다. 종목과 뉴스를 확인해 매매하세요. 이 안내가 열린 동안 시장은 일시정지됩니다.' })}>도움말</button><button onClick={() => state.setScreen('room')}>방 보기</button></header>
    <section className="account-strip"><div><small>총자산</small><strong>{money(netWorth)}</strong>{previousSummary && <small className={assetChange >= 0 ? 'green' : 'red'}>전일 대비 {assetChange >= 0 ? '+' : ''}{money(assetChange)}</small>}</div><div><small>현금</small><strong>{money(state.cash)}</strong></div><div><small>이번 주 상환</small><strong className="red">{money(state.debt)}</strong></div></section>
    <div className="trading-grid">
      <aside className="stock-list">{data.stocks.map((stock) => { 
        const current = state.currentPrices[stock.id] || stock.startPrice; 
        const change = (current / stock.startPrice - 1) * 100; 
        const qty = state.holdings[stock.id]?.quantity || 0;
        return <button key={stock.id} className={stock.id === selected.id ? 'active' : ''} onClick={() => state.selectStock(stock.id)}>
          <span><b>{stock.name}</b><small>{stock.sector}</small></span>
          <span><b>{money(current)}</b><small className={change >= 0 ? 'green' : 'red'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</small>{qty > 0 && <small style={{color: '#a0b0c0'}}>{qty}주 보유</small>}</span>
        </button> 
      })}</aside>
      <section className="chart-panel">
        <div className="chart-title">
          <div><small>{selected.sector}</small><h2>{selected.name}</h2></div>
          <strong>{money(currentPrice)}</strong>
        </div>
        <StockChart />
        <div className="order-bar">
          <div className="order-info">
            <span>보유 {holding.quantity}주</span>
            {holding.quantity > 0 && <span className={profitDiff >= 0 ? 'green' : 'red'}>수익: {profitDiff >= 0 ? '+' : ''}{money(profitDiff * holding.quantity)} ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)</span>}
          </div>
          <div className="order-controls">
            <div className="quantity-buttons">
              <button onClick={() => addQuantity(1)}>+1</button>
              <button onClick={() => addQuantity(5)}>+5</button>
              <button onClick={() => addQuantity(10)}>+10</button>
              <button onClick={() => addQuantity(100)}>+100</button>
            </div>
            <div className="max-buttons">
              <button onClick={setMaxBuy}>최대 매수</button>
              <button onClick={setMaxSell} disabled={holding.quantity <= 0}>최대 매도</button>
            </div>
            <div className="order-fields">
              <label>수량<input type="number" min="0" value={quantity} onChange={(event) => setQuantity(Math.max(0, Number(event.target.value) || 0))} /></label>
              <label>금액<input type="number" min="0" step="1" value={Math.round(buyTotal)} onChange={(event) => setQuantity(Math.max(0, Math.floor((Number(event.target.value) || 0) / currentPrice)))} /></label>
            </div>
          </div>
          <div className="order-actions">
            <div className="order-totals">
              <span className={canBuy ? '' : 'red'}>매수 {quantity}주 · {money(buyTotal)}</span>
              <span className={canSell ? '' : 'red'}>매도 {sellQuantity}주 · {money(sellTotal)}</span>
            </div>
            <div className="order-buttons">
              <button className="buy" disabled={!canBuy} onClick={() => state.buy(selected.id, quantity)}>매수</button>
              <button className="sell" disabled={!canSell} onClick={() => state.sell(selected.id, sellQuantity)}>매도</button>
            </div>
          </div>
        </div>
      </section>
      <aside className="news-panel"><h3>LIVE WIRE</h3>{[...state.visibleNews].reverse().map((item) => { const relatedStock = data.stocks.find((stock) => stock.id === item.stockId); const newsSeconds = item.progress * DAY_DURATION_SECONDS; return <article key={item.id}><small>{Math.floor(newsSeconds / 60)}:{String(Math.floor(newsSeconds % 60)).padStart(2, '0')} · {relatedStock?.name || '시장 속보'}</small><p>{item.text}</p></article> })}{state.visibleNews.length === 0 && <p className="muted">첫 속보를 기다리는 중…</p>}</aside>
    </div>
    {state.feedback && <div key={state.feedback.id} className={`money-pop ${state.feedback.amount >= 0 ? 'gain' : 'loss'}`}>{state.feedback.amount >= 0 ? '+' : ''}{money(state.feedback.amount)}</div>}
  </main>
}

function Ending() {
  const state = useGameStore()
  const clear = state.phase === 'clear'
  return <main className={`ending ${clear ? 'clear' : ''}`}><p className="eyebrow">{clear ? 'DEBT CLEARED' : 'ACCOUNT LIQUIDATED'}</p><h1>{clear ? '살아남았다.' : '끝났다.'}</h1><p>{clear ? '6주간의 우주 자본주의가 당신을 이기지 못했습니다.' : `${state.cycle}주차, 채권 추심 드론이 문을 두드립니다.`}</p><button className="primary" onClick={state.restart}>다시 시작</button></main>
}

function Overlay() {
  const overlay = useGameStore((state) => state.overlay)
  const close = useGameStore((state) => state.closeOverlay)
  const purchasedRumors = useGameStore((state) => state.purchasedRumors)
  const startDay = useGameStore((state) => state.startDay)
  const day = useGameStore((state) => state.day)
  if (!overlay) return null
  const isInformationOverlay = overlay.type === 'dayBriefing' || overlay.type === 'purchasedInfo'
  return (
    <div className="overlay-backdrop">
      <div className="overlay-modal">
        {overlay.title && <h2>{overlay.title}</h2>}
        {overlay.text && <p>{overlay.text}</p>}
        {isInformationOverlay && <div className="information-list">
          {purchasedRumors.length === 0 && <p className="muted">구입한 정보가 없습니다.</p>}
          {purchasedRumors.map((rumor) => <article key={rumor.id}><small>{rumor.source} · 신뢰도 {Math.round(rumor.accuracy * 100)}%</small><p>{rumor.text}</p></article>)}
        </div>}
        {overlay.type === 'dayBriefing'
          ? <button className="primary" onClick={startDay}>{day}일차 시작</button>
          : <button className="primary" onClick={close}>닫기</button>}
      </div>
    </div>
  )
}

function App() {
  const screen = useGameStore((state) => state.screen)
  const phase = useGameStore((state) => state.phase)

  useEffect(() => { stageEngine.start(); return () => stageEngine.stop() }, [])

  // market 로딩 중(phase === 'loading')에도 Room이 자체 로딩 화면을 그려야 하므로,
  // 여기서는 market 유무로 게이팅하지 않는다 — 각 컴포넌트가 필요하면 스스로 가드한다.
  const showEnding = phase === 'gameover' || phase === 'clear'
  const showTitle = screen === 'title' && !showEnding
  const showRoom = screen === 'room' && !showEnding
  const showPremarket = screen === 'monitor' && phase === 'premarket' && !showEnding
  const showMonitor = screen === 'monitor' && phase !== 'premarket' && !showEnding

  return (
    <div className="game-frame">
      <div style={{ display: showEnding ? 'block' : 'none', height: '100%' }}>
        <Ending />
      </div>
      <div style={{ display: showTitle ? 'block' : 'none', height: '100%' }}>
        <Title />
      </div>
      <div style={{ display: showRoom ? 'block' : 'none', height: '100%' }}>
        <Room />
      </div>
      <div style={{ display: showPremarket ? 'block' : 'none', height: '100%' }}>
        <main className="monitor-shell"><Premarket /></main>
      </div>
      <div style={{ display: showMonitor ? 'block' : 'none', height: '100%' }}>
        <Monitor />
      </div>
      <Overlay />
    </div>
  )
}

export default App
