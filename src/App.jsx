import { useEffect, useState } from 'react'
import './App.css'
import BgmController from './components/BgmController.jsx'
import MarketDesktop from './components/MarketDesktop.jsx'
import NightPanel from './components/NightPanel.jsx'
import RoomScene from './components/RoomScene.jsx'
import { stageEngine } from './engine/StageEngine.js'
import { fetchMarketCycle } from './services/marketService.js'
import { useGameStore } from './store/gameStore.js'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`
const subtitles = ['Upside Down', 'Useless Decision', 'Unpaid Space Debt', 'Urgent Sell Disaster']

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
  const [flashingRumorId, setFlashingRumorId] = useState(null)
  if (!state.market) return null
  const data = state.market.days[state.day - 1]
  const purchase = (rumor) => {
    if (!state.purchaseRumor(rumor)) return
    setFlashingRumorId(rumor.id)
    window.setTimeout(() => setFlashingRumorId(null), 450)
  }
  return <section className="panel premarket"><p className="eyebrow">WEEK {state.cycle} · DAY {state.day} · 정보 거래소</p><h2>필요한 정보를 구입하세요.</h2><div className="rumor-grid">{data.rumors.map((rumor) => { const purchased = state.purchasedRumors.some((item) => item.id === rumor.id); return <button key={rumor.id} className={`rumor ${purchased ? 'selected' : ''} ${flashingRumorId === rumor.id ? 'purchase-flash' : ''}`} onClick={() => purchase(rumor)} disabled={purchased || state.cash < rumor.cost}><span>{purchased ? '구입됨' : '암호화된 정보'}</span><strong>출처: {rumor.source}</strong><small>내용 및 신뢰도 미상 · {money(rumor.cost)}</small></button> })}</div><p className="purchase-summary">구입 {state.purchasedRumors.length}건 · 남은 현금 {money(state.cash)}</p><button className="primary" onClick={() => state.showOverlay({ type: 'dayBriefing', title: `${state.day}일차 정보 브리핑` })}>구입 완료</button></section>
}

function Settlement() {
  const state = useGameStore()
  const settle = async () => {
    const result = state.settleCycle()
    if (result?.result === 'next') state.loadNextCycle(await fetchMarketCycle(result.cycle))
  }
  return <section className="modal-card"><p className="eyebrow">WEEKLY COLLECTION</p><h2>7일이 지났습니다.</h2><p>현금 {money(state.cash)} / 상환액 {money(state.debt)}</p><button className="danger" onClick={settle}>{state.cash >= state.debt ? '빚을 갚는다' : '빈 지갑을 내민다'}</button></section>
}

function Room() {
  const state = useGameStore()
  return <RoomScene>
    <aside className="room-status"><b>{state.cycle}주차 · {state.day}일차</b><span>현금 {money(state.cash)}</span><span>상환액 {money(state.debt)}</span></aside>
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
