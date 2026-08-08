import { useEffect, useState } from 'react'
import { JOB_ENERGY_COST, JOB_REWARD, MAX_ENERGY } from '../config.js'
import { NIGHT_ACTIVITIES, NIGHT_ITEMS } from '../data/nightContent.js'
import { useGameStore } from '../store/gameStore.js'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`

export default function NightPanel() {
  const state = useGameStore()
  const [tab, setTab] = useState('activity')
  const drink = NIGHT_ITEMS.chiliEnergy
  const job = NIGHT_ACTIVITIES.convenienceJob

  useEffect(() => {
    if (state.nightActivity?.id !== job.id) return undefined
    const timer = window.setTimeout(state.completeNightJob, 1400)
    return () => window.clearTimeout(timer)
  }, [job.id, state.completeNightJob, state.nightActivity?.id])

  if (state.phase !== 'night') return null
  const drinkCount = state.inventory[drink.id] || 0

  return <section className="night-desktop">
    <header><div><p className="eyebrow">NIGHT SHIFT</p><h2>{state.cycle}주차 {state.day}일차 밤</h2></div><div className="energy-meter"><span>활동력 {state.energy}/{MAX_ENERGY}</span><progress max={MAX_ENERGY} value={state.energy} /></div></header>
    <nav className="night-tabs">
      <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>활동</button>
      <button className={tab === 'shop' ? 'active' : ''} onClick={() => setTab('shop')}>상점</button>
      <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>인벤토리 ({drinkCount})</button>
    </nav>
    <div className="night-content">
      {tab === 'activity' && <article className="night-entry"><div><h3>{job.name}</h3><p>{job.description}</p><small>활동력 -{JOB_ENERGY_COST} · 보상 약 {money(JOB_REWARD)}</small></div><button onClick={state.startNightJob} disabled={Boolean(state.nightActivity) || state.energy < JOB_ENERGY_COST}>일하러 가기</button></article>}
      {tab === 'shop' && <article className="night-entry"><div><h3>{drink.name}</h3><p>{drink.description}</p><small>{money(drink.price)}</small></div><button onClick={() => state.buyNightItem(drink)} disabled={Boolean(state.nightActivity) || state.cash < drink.price}>구입</button></article>}
      {tab === 'inventory' && <>{drinkCount > 0 ? <article className="night-entry"><div><h3>{drink.name} × {drinkCount}</h3><p>마시면 활동력을 아주 조금 회복한다.</p><small>활동력 +{drink.energyRestore}</small></div><button onClick={() => state.useNightItem(drink)} disabled={Boolean(state.nightActivity) || state.energy >= MAX_ENERGY}>마시기</button></article> : <p className="empty-state">인벤토리가 비어 있습니다.</p>}</>}
    </div>
    <button className="sleep-button" onClick={state.endNight} disabled={Boolean(state.nightActivity)}>자기</button>
    {state.nightActivity && <div className="activity-loading"><div className="loading-spinner" /><h3>편의점 야간 근무 중…</h3><p>재고 수량과 삶의 의미를 세는 중입니다.</p></div>}
    {state.nightMessage && <div className="night-dialogue"><p>{state.nightMessage}</p><button onClick={state.clearNightMessage}>확인</button></div>}
  </section>
}
