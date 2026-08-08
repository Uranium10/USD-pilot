import { useEffect, useState } from 'react'
import { JOB_ENERGY_COST, JOB_REWARD, MAX_ENERGY } from '../config.js'
import { NIGHT_ACTIVITIES, NIGHT_ITEMS } from '../data/nightContent.js'
import { minePaybackSeconds, mineRate, mineUpgradeCost, nextMineTier } from '../logic/miningSystem.js'
import { useGameStore } from '../store/gameStore.js'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`

export default function NightPanel() {
  const state = useGameStore()
  const [tab, setTab] = useState('activity')
  const drink = NIGHT_ITEMS.chiliEnergy
  const job = NIGHT_ACTIVITIES.convenienceJob
  const miningCost = mineUpgradeCost(state.miningTier)
  const currentMiningRate = mineRate(state.miningTier)
  const upgradedMiningRate = mineRate(nextMineTier(state.miningTier))
  const paybackSeconds = Math.ceil(minePaybackSeconds(state.miningTier))

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
      {tab === 'shop' && <div className="night-shop-list"><article className="night-entry"><div><h3>{drink.name}</h3><p>{drink.description}</p><small>{money(drink.price)} (하루 2개 제한, {2 - (state.dailyDrinkPurchased || 0)}개 남음)</small></div><button onClick={() => state.buyNightItem(drink)} disabled={Boolean(state.nightActivity) || state.cash < drink.price || state.dailyDrinkPurchased >= 2}>구입</button></article><article className="night-entry mining-machine"><div><p className="eyebrow">PASSIVE INCOME MODULE</p><h3>마이닝 머신 {state.miningTier < 0 ? '미보유' : `T.${state.miningTier}`}</h3><p>장 운영 중 크레딧을 천천히 생산하는 단일 채굴기입니다. 업그레이드하면 기존 기계를 대체합니다.</p><dl><div><dt>현재 생산</dt><dd>{currentMiningRate.toFixed(3)} ₡/초</dd></div><div><dt>{state.miningTier < 0 ? '설치 후' : `T.${nextMineTier(state.miningTier)} 생산`}</dt><dd>{upgradedMiningRate.toFixed(3)} ₡/초</dd></div><div><dt>{state.miningTier < 0 ? '설치 비용' : '업그레이드 비용'}</dt><dd>{money(miningCost)}</dd></div></dl><small className="mining-payback">추가 생산량 기준 약 {paybackSeconds.toLocaleString('ko-KR')}초 ({Math.ceil(paybackSeconds / 60).toLocaleString('ko-KR')}분) 후 회수</small></div><button onClick={state.upgradeMiningMachine} disabled={Boolean(state.nightActivity) || state.cash < miningCost}>{state.miningTier < 0 ? 'T.0 설치' : `T.${nextMineTier(state.miningTier)} 업그레이드`}</button></article></div>}
      {tab === 'inventory' && <>{drinkCount > 0 ? <article className="night-entry"><div><h3>{drink.name} × {drinkCount}</h3><p>마시면 활동력을 아주 조금 회복한다.</p><small>활동력 +{drink.energyRestore}</small></div><button onClick={() => state.useNightItem(drink)} disabled={Boolean(state.nightActivity) || state.energy >= MAX_ENERGY}>마시기</button></article> : <p className="empty-state">인벤토리가 비어 있습니다.</p>}</>}
    </div>
    <button className="sleep-button" onClick={state.endNight} disabled={Boolean(state.nightActivity)}>자기</button>
    {state.nightActivity && <div className="activity-loading"><div className="loading-spinner" /><h3>편의점 야간 근무 중…</h3><p>재고 수량과 삶의 의미를 세는 중입니다.</p></div>}
    {state.nightMessage && <div className="night-dialogue"><p>{state.nightMessage}</p><button onClick={state.clearNightMessage}>확인</button></div>}
  </section>
}
