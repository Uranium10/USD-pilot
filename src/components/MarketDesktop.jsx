import { useEffect, useRef, useState } from 'react'
import { DAY_DURATION_SECONDS } from '../config.js'
import { getMinPayment } from '../logic/debtSystem.js'
import { mineRate } from '../logic/miningSystem.js'
import { playCashRegister } from '../services/audioService.js'
import { getNetWorth, useGameStore } from '../store/gameStore.js'
import DayReport from './DayReport.jsx'
import InformationNotepad from './InformationNotepad.jsx'
import StockChart from './StockChart.jsx'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`
const formatMarketTime = (progress) => {
  const totalMinutes = 9 * 60 + Math.min(1, Math.max(0, progress)) * 9 * 60
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.floor(totalMinutes % 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function Taskbar({ activeApp, setActiveApp, onShutdown, elapsed }) {
  const marketTime = formatMarketTime(elapsed / DAY_DURATION_SECONDS)
  return <footer className="taskbar">
    <button className="shutdown" onClick={onShutdown} title="방으로 돌아가기">◐ 절전</button>
    <button title="U.S.D Market Terminal" className={activeApp === 'market' ? 'active' : ''} onClick={() => setActiveApp('market')}>▥ U.S.D Market Ter...</button>
    <button className={activeApp === 'notepad' ? 'active' : ''} onClick={() => setActiveApp('notepad')}>▤ 정보 모음.txt</button>
    <time title="게임 내 시장 시간">{marketTime}</time>
  </footer>
}

function StockGrid({ stocks, prices, onOpen }) {
  return <section className="all-stocks-grid">{stocks.map((stock) => {
    const current = prices[stock.id] || stock.startPrice
    const change = (current / stock.startPrice - 1) * 100
    return <article key={stock.id} className="stock-grid-card" role="button" tabIndex="0" onClick={() => onOpen(stock.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(stock.id) }}>
      <header><div><b>{stock.name}</b><small>{stock.sector}</small></div><span className={change >= 0 ? 'green' : 'red'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span></header>
      <StockChart stockId={stock.id} compact />
      <span className="inspect-stock" aria-hidden="true">⌕</span>
    </article>
  })}</section>
}

export default function MarketDesktop() {
  const state = useGameStore()
  const [quantity, setQuantity] = useState(1)
  const [activeApp, setActiveApp] = useState('market')
  const [listView, setListView] = useState(false)
  const [amountDraft, setAmountDraft] = useState('')
  const editingAmountRef = useRef(false)

  // 아래 useEffect가 훅 규칙(조건부 호출 금지)을 지키려면 market이 아직 없어도 계산할 수
  // 있어야 한다. market 로딩 전에는 안전한 기본값(0)으로 둔다.
  const data = state.market?.days[state.day - 1]
  const selected = data ? data.stocks.find((stock) => stock.id === state.selectedStockId) || data.stocks[0] : null
  const currentPrice = selected ? state.currentPrices[selected.id] || selected.startPrice : 0
  const buyTotal = currentPrice * quantity

  // 금액 입력칸은 "수량 × 현재가"를 매 렌더마다 다시 계산해 보여주는데, 입력 중에도 그대로
  // 덮어쓰면 한 자리 칠 때마다 값이 되돌아간다(예: 129원짜리 종목에 "500"을 치려고 "5"만
  // 쳐도 5÷129를 내림한 수량 0으로 되돌아가 버림). 그래서 입력 중(포커스 상태)에는 사용자가
  // 친 문자열을 그대로 유지하고, 포커스를 벗어나거나 수량이 다른 경로(버튼 등)로 바뀔 때만
  // 실제 금액으로 다시 맞춘다.
  useEffect(() => {
    if (editingAmountRef.current) return
    setAmountDraft(String(Math.round(buyTotal)))
  }, [buyTotal])

  if (!state.market) return null

  const holding = state.holdings[selected.id] || { quantity: 0, average: 0 }
  const sellQuantity = Math.min(quantity, holding.quantity)
  const sellTotal = currentPrice * sellQuantity
  const canBuy = quantity > 0 && buyTotal <= state.cash && state.phase === 'day'
  const canSell = sellQuantity > 0 && state.phase === 'day'
  const remaining = Math.max(0, DAY_DURATION_SECONDS - state.elapsed)
  const netWorth = getNetWorth(state)
  const previousSummary = state.dailySummaries.at(-1)
  const assetChange = previousSummary ? netWorth - previousSummary.netWorth : 0
  const profitDiff = holding.quantity > 0 ? currentPrice - holding.average : 0
  const profitPct = holding.quantity > 0 ? profitDiff / holding.average * 100 : 0
  const minPayment = getMinPayment(state.debt, state.cycle)
  const miningRate = mineRate(state.miningTier)

  const openStock = (stockId) => { state.selectStock(stockId); setListView(false); setActiveApp('market') }
  const toggleListView = () => setListView((isGrid) => !isGrid)
  const sell = () => { const result = state.sell(selected.id, sellQuantity); if (result?.profit > 0) playCashRegister() }
  const handleAmountChange = (event) => {
    const raw = event.target.value
    setAmountDraft(raw)
    if (raw.trim() === '') { setQuantity(0); return }
    const numeric = Number(raw)
    if (Number.isFinite(numeric)) setQuantity(Math.max(0, Math.floor(numeric / currentPrice)))
  }

  return <main className="desktop-shell">
    <div className="desktop-workspace">
      {activeApp === 'notepad' ? <InformationNotepad rumors={state.purchasedRumors} /> : <section className="desktop-window market-window">
        <div className="window-titlebar"><b>U.S.D Market Terminal</b><span className={remaining < 60 ? 'red' : ''}>장 마감 {Math.floor(remaining / 60)}:{String(Math.floor(remaining % 60)).padStart(2, '0')}　— □ ×</span></div>
        <section className="account-strip"><div className="asset-cell"><small>총자산</small><strong>{money(netWorth)}</strong>{previousSummary && <small className={assetChange >= 0 ? 'green' : 'red'}>전일 대비 {assetChange >= 0 ? '+' : ''}{money(assetChange)}</small>}{state.feedback && <div key={state.feedback.id} className={`asset-feedback ${state.feedback.amount >= 0 ? 'gain' : 'loss'}`}>{state.feedback.amount >= 0 ? '+' : ''}{money(state.feedback.amount)}</div>}</div><div><small>현금</small><strong>{money(state.cash)}</strong></div><div className="mining-income"><small>마이닝 {state.miningTier < 0 ? 'OFFLINE' : `T.${state.miningTier}`}</small><strong>{money(state.miningIncomeToday)}</strong><small>{miningRate.toFixed(3)} ₡/초</small></div><div><small>총 부채</small><strong className="red">{money(state.debt)}</strong></div><div><small>이번 주 최소 상환</small><strong className="red">{money(minPayment)}</strong></div></section>
        <div className="trading-grid">
          <aside className="stock-list">{data.stocks.map((stock) => { const current = state.currentPrices[stock.id] || stock.startPrice; const change = (current / stock.startPrice - 1) * 100; const qty = state.holdings[stock.id]?.quantity || 0; return <button key={stock.id} className={stock.id === selected.id ? 'active' : ''} onClick={() => openStock(stock.id)}><span><b>{stock.name}</b><small>{stock.sector}</small></span><span><b>{money(current)}</b><small className={change >= 0 ? 'green' : 'red'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</small>{qty > 0 && <small>{qty}주 보유</small>}</span></button>})}<button className="list-view-button" onClick={toggleListView}>{listView ? '↩ 이전으로' : '▦ 목록 보기'}</button></aside>
          {listView ? <StockGrid stocks={data.stocks} prices={state.currentPrices} onOpen={openStock} /> : <section className="chart-panel"><div className="chart-title"><div><small>{selected.sector}</small><h2>{selected.name}</h2></div><strong>{money(currentPrice)}</strong></div><StockChart /><div className="order-bar"><div className="order-info"><span>보유 {holding.quantity}주</span>{holding.quantity > 0 && <span className={profitDiff >= 0 ? 'green' : 'red'}>수익 {profitDiff >= 0 ? '+' : ''}{money(profitDiff * holding.quantity)} ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)</span>}</div><div className="order-controls"><div className="quantity-buttons">{[1, 5, 10, 100].map((amount) => <button key={amount} onClick={() => setQuantity((value) => Math.max(0, value + amount))}>+{amount}</button>)}</div><div className="max-buttons"><button onClick={() => setQuantity(Math.max(0, Math.floor(state.cash / currentPrice)))}>최대 매수</button><button onClick={() => setQuantity(holding.quantity)} disabled={!holding.quantity}>최대 매도</button></div><div className="order-fields"><label>수량<input type="number" min="0" value={quantity} onChange={(event) => setQuantity(Math.max(0, Number(event.target.value) || 0))} /></label><label>금액<input type="number" min="0" value={amountDraft} onFocus={() => { editingAmountRef.current = true }} onBlur={() => { editingAmountRef.current = false; setAmountDraft(String(Math.round(buyTotal))) }} onChange={handleAmountChange} /></label></div></div><div className="order-actions"><div className="order-totals"><span className={canBuy ? '' : 'red'}>매수 {quantity}주 · {money(buyTotal)}</span><span className={canSell ? '' : 'red'}>매도 {sellQuantity}주 · {money(sellTotal)}</span></div><div className="order-buttons"><button className="buy" disabled={!canBuy} onClick={() => state.buy(selected.id, quantity)}>매수</button><button className="sell" disabled={!canSell} onClick={sell}>매도</button></div></div></div></section>}
          <aside className="news-panel"><h3>LIVE WIRE</h3>{[...state.visibleNews].reverse().map((item) => { const related = data.stocks.find((stock) => stock.id === item.stockId); return <article key={item.id}><small>{formatMarketTime(item.progress)} · {related?.name}</small><p>{item.text}</p></article> })}{state.visibleNews.length === 0 && <p className="muted">첫 속보를 기다리는 중…</p>}</aside>
        </div>
      </section>}
    </div>
    <Taskbar activeApp={activeApp} setActiveApp={setActiveApp} onShutdown={() => state.setScreen('room')} elapsed={state.elapsed} />
    <DayReport />
  </main>
}
