import { useEffect, useRef, useState } from 'react'
import { COIN_ASSET_ID, COIN_SELL_SPREAD, DAY_DURATION_SECONDS, DAYS_PER_CYCLE, MARKET_CLOSING_WARN_SECONDS, SISYPHUS_STOCK_ID } from '../config.js'
import { formatMarketTime, formatMarketTimeFromElapsed } from '../logic/marketClock.js'
import { buyExecutionPrice, formatAssetQuantity, isCoinAsset, normalizeTradeQuantity, sellExecutionPrice } from '../logic/coinSystem.js'
import { getMinPayment } from '../logic/debtSystem.js'
import { mineRate } from '../logic/miningSystem.js'
import { newsBody } from '../logic/newsText.js'
import { getWeeklyModifier, modifierEffect } from '../logic/weeklyModifiers.js'
import { playCashOut, playCashRegister, playMarketCountdown, playNewsUpdate } from '../services/audioService.js'
import { getNetWorth, isHiddenEndingEligible, useGameStore } from '../store/gameStore.js'
import DayReport from './DayReport.jsx'
import InformationNotepad from './InformationNotepad.jsx'
import OverflowMarquee from './OverflowMarquee.jsx'
import ShareholderMail from './ShareholderMail.jsx'
import StockChart from './StockChart.jsx'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`
const assetClass = (stock) => stock?.id === SISYPHUS_STOCK_ID ? 'asset-sisyphus' : stock?.id === COIN_ASSET_ID ? 'asset-coin' : ''
function Taskbar({ activeApp, setActiveApp, onShutdown, elapsed, cycle, day, mailEligible }) {
  const marketTime = formatMarketTimeFromElapsed(elapsed)
  return <footer className="taskbar">
    <button className="shutdown" onClick={onShutdown} title="방으로 돌아가기">◐ 절전</button>
    <button title="U.S.D Market Terminal" className={activeApp === 'market' ? 'active' : ''} onClick={() => setActiveApp('market')}>▥ U.S.D Market Ter...</button>
    <button className={activeApp === 'notepad' ? 'active' : ''} onClick={() => setActiveApp('notepad')}>▤ 정보 모음.txt</button>
    {mailEligible && <button className={`mail-alert ${activeApp === 'mail' ? 'active' : ''}`} onClick={() => setActiveApp('mail')}>✉ 주주총회 (긴급)</button>}
    <span style={{ marginLeft: 'auto', fontSize: '12px', padding: '0 8px' }}>{cycle}주차 {day}/{DAYS_PER_CYCLE}일</span>
    <time title="게임 내 시장 시간" style={{ marginLeft: 0 }}>{marketTime}</time>
  </footer>
}

function StockGrid({ stocks, prices, onOpen, coinUnlocked }) {
  return <section className="all-stocks-grid">{stocks.map((stock) => {
    const locked = isCoinAsset(stock) && !coinUnlocked
    const current = prices[stock.id] || stock.startPrice
    const change = (current / stock.startPrice - 1) * 100
    return <article key={stock.id} className={`stock-grid-card ${assetClass(stock)} ${locked ? 'coin-locked-card' : ''}`} role={locked ? undefined : 'button'} tabIndex={locked ? undefined : '0'} onClick={locked ? undefined : () => onOpen(stock.id)} onKeyDown={locked ? undefined : (event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(stock.id) }}>
      <header><div><OverflowMarquee as="b">{stock.name}</OverflowMarquee><OverflowMarquee as="small">{locked ? '채굴기 설치 후 거래 가능' : stock.sector}</OverflowMarquee></div>{locked ? <span>LOCKED</span> : <span className={change >= 0 ? 'green' : 'red'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>}</header>
      {locked ? <div className="coin-lock-visual"><b>◆</b><span>암호자산 거래소 잠김</span></div> : <StockChart stockId={stock.id} compact />}
      {!locked && <span className="inspect-stock" aria-hidden="true">⌕</span>}
    </article>
  })}</section>
}

export default function MarketDesktop() {
  const state = useGameStore()
  const [quantity, setQuantity] = useState(1)
  const [activeApp, setActiveApp] = useState('market')
  const [listView, setListView] = useState(false)
  const [amountDraft, setAmountDraft] = useState('')
  const [newestNewsIds, setNewestNewsIds] = useState([])
  const editingAmountRef = useRef(false)
  const previousNewsIdsRef = useRef(null)
  const lastCountdownRef = useRef(null)

  // 아래 useEffect가 훅 규칙(조건부 호출 금지)을 지키려면 market이 아직 없어도 계산할 수
  // 있어야 한다. market 로딩 전에는 안전한 기본값(0)으로 둔다.
  const data = state.market?.days[state.day - 1]
  const selected = data ? data.stocks.find((stock) => stock.id === state.selectedStockId) || data.stocks[0] : null
  const orderedStocks = data ? [...data.stocks].sort((left, right) => {
    const rank = (stock) => stock.id === COIN_ASSET_ID ? 2 : stock.id === SISYPHUS_STOCK_ID ? 1 : 0
    return rank(left) - rank(right)
  }) : []
  const currentPrice = selected ? state.currentPrices[selected.id] || selected.startPrice : 0
  const selectedIsCoin = isCoinAsset(selected)
  const coinUnlocked = state.miningTier >= 0
  const buyPrice = selected ? buyExecutionPrice(selected, currentPrice) : 0
  const sellPrice = selected ? sellExecutionPrice(selected, currentPrice) : 0
  const buyTotal = buyPrice * quantity
  const remaining = Math.max(0, DAY_DURATION_SECONDS - state.elapsed)
  const countdown = state.phase === 'day' && remaining > 0 && remaining <= 5 ? Math.ceil(remaining) : null

  // 금액 입력칸은 "수량 × 현재가"를 매 렌더마다 다시 계산해 보여주는데, 입력 중에도 그대로
  // 덮어쓰면 한 자리 칠 때마다 값이 되돌아간다(예: 129원짜리 종목에 "500"을 치려고 "5"만
  // 쳐도 5÷129를 내림한 수량 0으로 되돌아가 버림). 그래서 입력 중(포커스 상태)에는 사용자가
  // 친 문자열을 그대로 유지하고, 포커스를 벗어나거나 수량이 다른 경로(버튼 등)로 바뀔 때만
  // 실제 금액으로 다시 맞춘다.
  useEffect(() => {
    if (editingAmountRef.current) return
    setAmountDraft(String(Math.round(buyTotal)))
  }, [buyTotal])

  useEffect(() => {
    const currentIds = state.visibleNews.map((item) => item.id)
    if (previousNewsIdsRef.current === null) {
      previousNewsIdsRef.current = new Set(currentIds)
      return
    }
    const addedIds = currentIds.filter((id) => !previousNewsIdsRef.current.has(id))
    previousNewsIdsRef.current = new Set(currentIds)
    if (!addedIds.length) return
    playNewsUpdate()
    setNewestNewsIds(addedIds)
    const timer = window.setTimeout(() => setNewestNewsIds([]), 1400)
    return () => window.clearTimeout(timer)
  }, [state.visibleNews])

  useEffect(() => {
    if (countdown === null) {
      lastCountdownRef.current = null
      return
    }
    if (lastCountdownRef.current === countdown) return
    lastCountdownRef.current = countdown
    playMarketCountdown()
  }, [countdown])

  if (!state.market) return null

  const holding = state.holdings[selected.id] || { quantity: 0, average: 0 }
  const sellQuantity = Math.min(quantity, holding.quantity)
  const sellTotal = sellPrice * sellQuantity
  const canTradeSelected = !selectedIsCoin || coinUnlocked
  const netWorth = getNetWorth(state)
  const maxPositionRatio = modifierEffect(state.weeklyModifierId, 'maxPositionRatio', 1)
  const positionRoom = Math.max(0, netWorth * maxPositionRatio - holding.quantity * currentPrice)
  const maxBuyBudget = Math.min(state.cash, positionRoom)
  const canBuy = !selectedIsCoin && canTradeSelected && quantity > 0 && buyTotal <= maxBuyBudget && state.phase === 'day'
  const canSell = canTradeSelected && sellQuantity > 0 && state.phase === 'day'
  const previousSummary = state.dailySummaries.at(-1)
  const assetBaseline = previousSummary?.netWorth ?? state.dayStartNetWorth
  const showAssetChange = Boolean(previousSummary) || state.phase === 'day' || state.phase === 'dayReport'
  const assetChange = netWorth - assetBaseline
  const profitDiff = holding.quantity > 0 ? sellPrice - holding.average : 0
  const profitPct = holding.quantity > 0 && holding.average > 0 ? profitDiff / holding.average * 100 : null
  const minPayment = getMinPayment(state.debt, state.cycle)
  const miningRate = mineRate(state.miningTier) * modifierEffect(state.weeklyModifierId, 'miningRateMultiplier')
  const weeklyModifier = getWeeklyModifier(state.weeklyModifierId)
  const coinPrice = state.currentPrices[COIN_ASSET_ID] || data.stocks.find((stock) => stock.id === COIN_ASSET_ID)?.startPrice || 0
  const coinAsset = data.stocks.find((stock) => stock.id === COIN_ASSET_ID)
  const quantityUnit = selectedIsCoin ? ` ${selected.symbol}` : '주'
  const quantityButtons = [1, 5, 10, 100]

  const openStock = (stockId) => {
    const asset = data.stocks.find((stock) => stock.id === stockId)
    if (isCoinAsset(asset) && !coinUnlocked) return
    state.selectStock(stockId)
    setQuantity(isCoinAsset(asset) ? 0.1 : 1)
    setListView(false)
    setActiveApp('market')
  }
  const toggleListView = () => setListView((isGrid) => !isGrid)
  const buy = () => { const result = state.buy(selected.id, quantity); if (result) playCashOut() }
  const sell = () => { const result = state.sell(selected.id, sellQuantity); if (result) playCashRegister() }
  const handleAmountChange = (event) => {
    const raw = event.target.value
    setAmountDraft(raw)
    if (raw.trim() === '') { setQuantity(0); return }
    const numeric = Number(raw)
    if (Number.isFinite(numeric)) setQuantity(normalizeTradeQuantity(selected, numeric / buyPrice))
  }

  return <main className="desktop-shell">
    <div className="desktop-workspace">
      {activeApp === 'notepad' ? <InformationNotepad rumors={state.purchasedRumors} />
        : activeApp === 'mail' ? <ShareholderMail />
        : <section className="desktop-window market-window">
        <div className="window-titlebar">
          <b>U.S.D Market Terminal</b>
          <span className={remaining < MARKET_CLOSING_WARN_SECONDS ? 'red' : ''}>{weeklyModifier ? `${weeklyModifier.name} · ` : ''}장 마감 {Math.floor(remaining / 60)}:{String(Math.floor(remaining % 60)).padStart(2, '0')}　— □ ×</span>
        </div>
        <section className="account-strip">
          <div className="asset-cell">
            <small>총자산</small><strong>{money(netWorth)}</strong>
            {showAssetChange && <small className={assetChange >= 0 ? 'green' : 'red'}>{previousSummary ? '전일 대비' : '시작 자산 대비'} {assetChange >= 0 ? '+' : ''}{money(assetChange)}</small>}
            {state.feedback && <div key={state.feedback.id} className={`asset-feedback ${state.feedback.amount >= 0 ? 'gain' : 'loss'}`}>{state.feedback.amount >= 0 ? '+' : ''}{money(state.feedback.amount)}</div>}
          </div>
          <div><small>현금</small><strong>{money(state.cash)}</strong></div>
          <div className="mining-income">
            <small>마이닝 {state.miningTier < 0 ? 'OFFLINE' : `T.${state.miningTier}`}</small>
            <strong>{formatAssetQuantity(coinAsset, state.minedCoinToday)} DUST</strong>
            <small>{miningRate.toFixed(4)} DUST/초 · {money(state.minedCoinToday * coinPrice)}</small>
          </div>
          <div><small>총 부채</small><strong className="red">{money(state.debt)}</strong></div>
          <div><small>주간 목표 상환액</small><strong className="red">{money(minPayment)}</strong></div>
        </section>
        <div className="trading-grid">
          <aside className="stock-list">
            {orderedStocks.map((stock) => {
              const locked = isCoinAsset(stock) && !coinUnlocked
              const current = state.currentPrices[stock.id] || stock.startPrice
              const change = (current / stock.startPrice - 1) * 100
              const qty = state.holdings[stock.id]?.quantity || 0
              return <button key={stock.id} className={`${assetClass(stock)} ${stock.id === selected.id ? 'active' : ''} ${locked ? 'coin-locked' : ''}`} disabled={locked} onClick={() => openStock(stock.id)}>
                <span><OverflowMarquee as="b">{locked ? '◆ 암호자산 슬롯' : stock.name}</OverflowMarquee><OverflowMarquee as="small">{locked ? '채굴기 설치 필요' : stock.sector}</OverflowMarquee></span>
                <span>{locked ? <><OverflowMarquee as="b">LOCKED</OverflowMarquee><OverflowMarquee as="small">상점에서 T.0 설치</OverflowMarquee></> : <><b>{money(current)}</b><small className={change >= 0 ? 'green' : 'red'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</small>{qty > 0 && <small>{formatAssetQuantity(stock, qty)}{isCoinAsset(stock) ? ` ${stock.symbol}` : '주'} 보유</small>}</>}</span>
              </button>
            })}
            <button className="list-view-button" onClick={toggleListView}>{listView ? '↩ 이전으로' : '▦ 목록 보기'}</button>
          </aside>
          {listView
            ? <StockGrid stocks={orderedStocks} prices={state.currentPrices} onOpen={openStock} coinUnlocked={coinUnlocked} />
            : <section className={`chart-panel ${assetClass(selected)}`}>
              {countdown !== null && <div className="market-countdown" aria-live="polite">{countdown}</div>}
              <div className="chart-title">
                <div><small>{selected.sector}{selectedIsCoin ? ` · 채굴·판매 전용 · 판매 비용 ${(COIN_SELL_SPREAD * 100).toFixed(1)}%` : ''}</small><h2>{selected.name}</h2></div>
                <strong>{money(currentPrice)}</strong>
              </div>
              <StockChart />
              <div className="order-bar">
                <div className="order-info">
                  <span>보유 {formatAssetQuantity(selected, holding.quantity)}{quantityUnit}</span>
                  {holding.quantity > 0 && (profitPct === null
                    ? <span className="green">채굴분 평가액 {money(currentPrice * holding.quantity)}</span>
                    : <span className={profitDiff >= 0 ? 'green' : 'red'}>수익 {profitDiff >= 0 ? '+' : ''}{money(profitDiff * holding.quantity)} ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)</span>)}
                </div>
                <div className="order-controls">
                  <div className="quantity-buttons">{selectedIsCoin
                    ? <><button onClick={() => setQuantity(normalizeTradeQuantity(selected, holding.quantity * 0.25))}>25%</button><button onClick={() => setQuantity(normalizeTradeQuantity(selected, holding.quantity * 0.5))}>50%</button><button onClick={() => setQuantity(normalizeTradeQuantity(selected, holding.quantity))}>전량</button></>
                    : quantityButtons.map((amount) => <button key={amount} onClick={() => setQuantity((value) => normalizeTradeQuantity(selected, value + amount))}>+{amount}</button>)}</div>
                  <div className="max-buttons">
                    {!selectedIsCoin && <button onClick={() => setQuantity(normalizeTradeQuantity(selected, maxBuyBudget / buyPrice))}>최대 매수</button>}
                    <button onClick={() => setQuantity(holding.quantity)} disabled={!holding.quantity}>최대 매도</button>
                    <button onClick={() => setQuantity(0)} disabled={quantity <= 0}>초기화</button>
                  </div>
                  <div className="order-fields">
                    <label>수량<input type="number" min="0" step={selectedIsCoin ? 0.0001 : 1} value={quantity} onChange={(event) => setQuantity(normalizeTradeQuantity(selected, event.target.value))} /></label>
                    {!selectedIsCoin && <label>금액<input type="number" min="0" value={amountDraft} onFocus={() => { editingAmountRef.current = true }} onBlur={() => { editingAmountRef.current = false; setAmountDraft(String(Math.round(buyTotal))) }} onChange={handleAmountChange} /></label>}
                  </div>
                </div>
                <div className="order-actions">
                  <div className="order-totals">
                    {!selectedIsCoin && <span className={canBuy ? '' : 'red'}>매수 {formatAssetQuantity(selected, quantity)}{quantityUnit} · {money(buyTotal)}</span>}
                    <span className={canSell ? '' : 'red'}>매도 {formatAssetQuantity(selected, sellQuantity)}{quantityUnit} · {money(sellTotal)}</span>
                  </div>
                  <div className="order-buttons">{!selectedIsCoin && <button className="buy" disabled={!canBuy} onClick={buy}>매수</button>}<button className="sell" disabled={!canSell} onClick={sell}>{selectedIsCoin ? 'DUST 판매' : '매도'}</button></div>
                </div>
              </div>
            </section>}
          <aside className="news-panel"><h3>LIVE WIRE</h3>{[...state.visibleNews].reverse().map((item) => { const related = data.stocks.find((stock) => stock.id === item.stockId); if (!related) return null; return <article key={item.id} className={`${assetClass(related)} ${newestNewsIds.includes(item.id) ? 'news-new' : ''}`}><small>{formatMarketTime(item.progress)} · {related.name}</small><p>{newsBody(item.text, related.name)}</p></article> })}{state.visibleNews.every((item) => !data.stocks.some((stock) => stock.id === item.stockId)) && <p className="muted">첫 속보를 기다리는 중…</p>}</aside>
        </div>
      </section>}
    </div>
    <Taskbar activeApp={activeApp} setActiveApp={setActiveApp} onShutdown={() => state.setScreen('room')} elapsed={state.elapsed} cycle={state.cycle} day={state.day} mailEligible={isHiddenEndingEligible(state)} />
    <DayReport />
  </main>
}
