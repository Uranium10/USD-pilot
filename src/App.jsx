import { useEffect, useState } from 'react'
import './App.css'
import BgmController from './components/BgmController.jsx'
import MarketDesktop from './components/MarketDesktop.jsx'
import NightPanel from './components/NightPanel.jsx'
import RoomScene from './components/RoomScene.jsx'
import { COIN_ASSET_ID, DAYS_PER_CYCLE, INTEREST_RATE } from './config.js'
import { stageEngine } from './engine/StageEngine.js'
import { getMinPayment } from './logic/debtSystem.js'
import { fetchMarketCycle } from './services/marketService.js'
import { useGameStore } from './store/gameStore.js'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`
const subtitles = ['Upside Down', 'Useless Decision', 'Unpaid Space Debt', 'Urgent Sell Disaster', 'Universal Space Depression', 'Unbelievable Stock Drop', 'Ultimate Survival Day', 'Unfair System Design', 'Underground Stock Dealer', 'Unlimited Space Dream']

function Title() {
  const beginLoading = useGameStore((state) => state.beginLoading)
  const loadMarket = useGameStore((state) => state.loadMarket)
  const [loading, setLoading] = useState(false)
  const [subtitle] = useState(() => subtitles[Math.floor(Math.random() * subtitles.length)])
  const start = async () => {
    setLoading(true)
    beginLoading()
    loadMarket(await fetchMarketCycle(1))
  }
  return <main className="title-screen"><p className="eyebrow">DEBT SURVIVAL TERMINAL</p><h1>U.S.D</h1><p className="subtitle">{subtitle}</p><button className="primary large" onClick={start} disabled={loading}>{loading ? '시장 생성 중…' : '게임 시작'}</button></main>
}

function Premarket() {
  const state = useGameStore()
  const [selectedRumorIds, setSelectedRumorIds] = useState([])
  const [flashingRumorIds, setFlashingRumorIds] = useState([])
  if (!state.market) return null
  const data = state.market.days[state.day - 1]
  const selectedRumors = data.rumors.filter((rumor) => selectedRumorIds.includes(rumor.id))
  const selectedCost = selectedRumors.reduce((total, rumor) => total + rumor.cost, 0)
  const toggleRumor = (rumorId) => setSelectedRumorIds((ids) => ids.includes(rumorId) ? ids.filter((id) => id !== rumorId) : [...ids, rumorId])
  const purchaseSelected = () => {
    const purchased = state.purchaseRumors(selectedRumors)
    if (!purchased) return
    setFlashingRumorIds(purchased.map((rumor) => rumor.id))
    setSelectedRumorIds([])
    window.setTimeout(() => setFlashingRumorIds([]), 450)
  }
  return <section className="panel premarket"><p className="eyebrow">WEEK {state.cycle} · DAY {state.day} · 정보 거래소</p><h2>정보를 구입하세요.</h2><div className="rumor-grid">{data.rumors.map((rumor) => { const purchased = state.purchasedRumors.some((item) => item.id === rumor.id); const queued = selectedRumorIds.includes(rumor.id); return <button key={rumor.id} className={`rumor ${purchased ? 'selected' : ''} ${queued ? 'queued' : ''} ${flashingRumorIds.includes(rumor.id) ? 'purchase-flash' : ''}`} onClick={() => toggleRumor(rumor.id)} disabled={purchased}><span>{purchased ? '구입됨' : queued ? '구매 선택됨' : '암호화된 정보'}</span><strong>출처: {rumor.source}</strong><small>{purchased ? `신뢰도 ${Math.round(rumor.accuracy * 100)}% 확인됨` : '내용 및 신뢰도 미상'} · {money(rumor.cost)}</small></button> })}</div><p className="purchase-summary">구입 {state.purchasedRumors.length}건 · 선택 {selectedRumors.length}건 ({money(selectedCost)}) · 남은 현금 {money(state.cash)}</p><div className="premarket-actions"><button className="secondary" onClick={purchaseSelected} disabled={selectedRumors.length === 0 || selectedCost > state.cash}>선택 정보 구입</button><button className="primary" onClick={() => state.showOverlay({ type: 'dayBriefing', title: `${state.day}일차 정보 브리핑` })}>구입 완료</button></div></section>
}

function Settlement() {
  const state = useGameStore()
  const [extra, setExtra] = useState(0)
  const minPayment = getMinPayment(state.debt, state.cycle)
  const maxPayable = Math.max(0, Math.min(state.cash, state.debt))
  const canPayMin = state.cash >= minPayment
  const maxExtra = Math.max(0, maxPayable - minPayment)
  const clampedExtra = Math.min(extra, maxExtra)
  const payAmount = minPayment + clampedExtra
  // 지금 payAmount만큼 갚으면 다음 주기로 넘어갈 남은 부채에 이자가 얼마나 붙는지 미리 보여준다.
  // (최소 상환만 했을 때의 이자와 비교해서 "선상환으로 아끼는 이자"를 계산한다.)
  const interestIfMinOnly = Math.round(Math.max(0, state.debt - minPayment) * INTEREST_RATE)
  const interestIfPay = Math.round(Math.max(0, state.debt - payAmount) * INTEREST_RATE)
  const interestSaved = interestIfMinOnly - interestIfPay

  const settle = async (amount) => {
    const result = state.settleCycle(amount)
    if (result?.result === 'next') {
      state.loadNextCycle(await fetchMarketCycle(result.cycle, state.market?.companyIds, state.currentPrices[COIN_ASSET_ID]))
    }
  }

  return <section className="modal-card settlement-card">
    <p className="eyebrow">WEEKLY COLLECTION</p>
    <h2>{DAYS_PER_CYCLE}일이 지났습니다.</h2>
    <dl className="settlement-figures">
      <div><dt>보유 현금</dt><dd>{money(state.cash)}</dd></div>
      <div><dt>이번 주 최소 상환액</dt><dd>{money(minPayment)}</dd></div>
      <div><dt>총 부채</dt><dd>{money(state.debt)}</dd></div>
    </dl>
    {canPayMin ? <>
      <label className="extra-payment">
        <span>추가 상환(선상환) <strong>{money(clampedExtra)}</strong></span>
        <input type="range" min="0" max={maxExtra} step="100" value={clampedExtra} onChange={(event) => setExtra(Number(event.target.value))} disabled={maxExtra <= 0} />
      </label>
      <p className="settlement-preview">이번에 {money(payAmount)} 상환 시 다음 주기 이자 {interestSaved > 0 ? `−${money(interestSaved)}` : money(0)}</p>
      <div className="settlement-actions">
        <button className="secondary" onClick={() => settle(minPayment)}>최소 상환</button>
        <button className="danger" onClick={() => settle(payAmount)}>{clampedExtra > 0 ? `${money(payAmount)} 상환한다` : '상환한다'}</button>
      </div>
    </> : <button className="danger" onClick={() => settle(state.cash)}>빈 지갑을 내민다</button>}
  </section>
}

function Room() {
  const state = useGameStore()
  const minPayment = getMinPayment(state.debt, state.cycle)
  return <RoomScene>
    <header className="room-title"><b>U.S.D</b><span>UNPAID SPACE DEBT</span></header>
    <aside className="room-status"><b>{state.cycle}주차 · {state.day}일차</b><span>현금 {money(state.cash)}</span><span>총부채 {money(state.debt)}</span><span>최소상환 {money(minPayment)}</span></aside>
    <NightPanel />
    {state.phase === 'settlement' && <Settlement />}
  </RoomScene>
}

function Overlay() {
  const state = useGameStore()
  if (!state.overlay) return null
  const information = state.overlay.type === 'dayBriefing' || state.overlay.type === 'purchasedInfo'
  return <div className="overlay-backdrop"><div className="overlay-modal">{state.overlay.title && <h2>{state.overlay.title}</h2>}{state.overlay.text && <p>{state.overlay.text}</p>}{information && <div className="information-list">{state.purchasedRumors.length === 0 && <p className="muted">구입한 정보가 없습니다.</p>}{state.purchasedRumors.map((rumor) => <article key={rumor.id}><small>{rumor.source} · 신뢰도 {Math.round(rumor.accuracy * 100)}%</small><p>{rumor.text}</p></article>)}</div>}{state.overlay.type === 'dayBriefing' ? <button className="primary" onClick={state.startDay}>{state.day}일차 시작</button> : <button className="primary" onClick={state.closeOverlay}>닫기</button>}</div></div>
}

function Ending() {
  const state = useGameStore()
  const clear = state.phase === 'clear'
  return <main className={`ending ${clear ? 'clear' : ''}`}><p className="eyebrow">{clear ? 'DEBT CLEARED' : 'ACCOUNT LIQUIDATED'}</p><h1>{clear ? '살아남았다.' : '끝났다.'}</h1><p>{clear ? '6주간의 우주 자본주의가 당신을 이기지 못했습니다.' : `${state.cycle}주차, 채권 추심 드론이 문을 두드립니다.`}</p><button className="primary" onClick={state.restart}>다시 시작</button></main>
}

export default function App() {
  const screen = useGameStore((state) => state.screen)
  const phase = useGameStore((state) => state.phase)
  useEffect(() => { stageEngine.start(); return () => stageEngine.stop() }, [])
  const ending = phase === 'gameover' || phase === 'clear'
  return <div className="game-frame"><BgmController /><div style={{ display: ending ? 'block' : 'none' }}><Ending /></div><div style={{ display: screen === 'title' && !ending ? 'block' : 'none' }}><Title /></div><div style={{ display: screen === 'room' && !ending ? 'block' : 'none' }}><Room /></div><div style={{ display: screen === 'monitor' && phase === 'premarket' && !ending ? 'block' : 'none' }}><main className="monitor-shell"><Premarket /></main></div><div style={{ display: screen === 'monitor' && phase !== 'premarket' && !ending ? 'block' : 'none' }}><MarketDesktop /></div><Overlay /></div>
}
