import { useEffect, useState } from 'react'
import { COIN_ASSET_ID, COIN_REFERENCE_PRICE, CYBER_RUNNER_ENERGY_COST, DAY_DURATION_SECONDS, HACKING_DECK_COSTS, JOB_ENERGY_COST, JOB_REWARD, MAX_ENERGY } from '../config.js'
import { NIGHT_ACTIVITIES, NIGHT_ITEMS } from '../data/nightContent.js'
import { canUpgradeMine, maxMineTier, minePaybackSeconds, mineRate, mineUpgradeCost, nextMineTier } from '../logic/miningSystem.js'
import { playCashOut, playCashRegister } from '../services/audioService.js'
import { useGameStore } from '../store/gameStore.js'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`

export default function NightPanel() {
  const state = useGameStore()
  const [tab, setTab] = useState('activity')
  const drink = NIGHT_ITEMS.chiliEnergy
  const ticket = NIGHT_ITEMS.smugglingTicket
  const deck = NIGHT_ITEMS.hackingDeck
  const job = NIGHT_ACTIVITIES.convenienceJob
  const cyberRunner = NIGHT_ACTIVITIES.cyberRunner
  const miningCost = mineUpgradeCost(state.miningTier)
  const currentMiningRate = mineRate(state.miningTier)
  const upgradedMiningRate = mineRate(nextMineTier(state.miningTier))
  const coinPrice = state.miningTier < 0 ? COIN_REFERENCE_PRICE : state.currentPrices[COIN_ASSET_ID] || COIN_REFERENCE_PRICE
  const paybackSeconds = Math.ceil(minePaybackSeconds(state.miningTier, coinPrice))
  const paybackDays = Math.ceil(paybackSeconds / DAY_DURATION_SECONDS)
  const tierLimit = maxMineTier(state.cycle)
  const canUpgrade = canUpgradeMine(state.miningTier, state.cycle)

  useEffect(() => {
    const activityId = state.nightActivity?.id
    if (![job.id, cyberRunner.id].includes(activityId)) return undefined
    const complete = activityId === job.id ? state.completeNightJob : state.completeCyberRunner
    const timer = window.setTimeout(() => { const result = complete(); if (result?.rewardEarned) playCashRegister() }, 1400)
    return () => window.clearTimeout(timer)
  }, [cyberRunner.id, job.id, state.completeCyberRunner, state.completeNightJob, state.nightActivity?.id])

  if (state.phase !== 'night') return null
  const drinkCount = state.inventory[drink.id] || 0
  const spend = (action) => { const result = action(); if (result) playCashOut(); return result }

  return <section className="night-desktop">
    <header><div><p className="eyebrow">NIGHT SHIFT</p><h2>{state.cycle}주차 {state.day}일차 밤</h2></div><div className="energy-meter"><span>활동력 {state.energy}/{MAX_ENERGY}</span><progress max={MAX_ENERGY} value={state.energy} /></div></header>
    <nav className="night-tabs">
      <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>활동</button>
      <button className={tab === 'shop' ? 'active' : ''} onClick={() => setTab('shop')}>상점</button>
      <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>인벤토리 ({drinkCount})</button>
    </nav>
    <div className="night-content">
      {tab === 'activity' && <>
        <article className="night-entry"><img src={job.img} alt="" className="item-thumbnail" /><div><h3>{job.name}</h3><p>{job.description}</p><small>활동력 -{JOB_ENERGY_COST} · 보상 약 {money(JOB_REWARD)}</small></div><button onClick={state.startNightJob} disabled={Boolean(state.nightActivity) || state.energy < JOB_ENERGY_COST}>일하러 가기</button></article>
        {state.hackingDeckLevel >= 0 && <article className="night-entry cyber-runner"><img src={cyberRunner.img} alt="" className="item-thumbnail" /><div><h3>{cyberRunner.name}</h3><p>{cyberRunner.description}</p><small>덱 v.{state.hackingDeckLevel} · 활동력 -{CYBER_RUNNER_ENERGY_COST} · 크레딧/DUST/시지프 주식 중 무작위 획득</small></div><button onClick={state.startCyberRunner} disabled={Boolean(state.nightActivity) || state.energy < CYBER_RUNNER_ENERGY_COST}>침투 시작</button></article>}
      </>}
      {tab === 'shop' && <div className="night-shop-list">
        <article className="night-entry"><img src={drink.img} alt="" className="item-thumbnail" /><div><h3>{drink.name}</h3><p>{drink.description}</p><small>{money(drink.price)} (하루 2개 제한, {2 - (state.dailyDrinkPurchased || 0)}개 남음)</small></div><button onClick={() => spend(() => state.buyNightItem(drink))} disabled={Boolean(state.nightActivity) || state.cash < drink.price || state.dailyDrinkPurchased >= 2}>구입</button></article>
        {state.hackingDeckLevel < HACKING_DECK_COSTS.length - 1 && <article className="night-entry hacking-deck"><img src={deck.img} alt="" className="item-thumbnail" /><div><h3>{state.hackingDeckLevel < 0 ? deck.name : `해킹 덱 v.${state.hackingDeckLevel + 1} 개조`}</h3><p>{deck.description}</p><small>{money(HACKING_DECK_COSTS[state.hackingDeckLevel + 1])} · 보상량 배율 ×{state.hackingDeckLevel + 2}</small></div><button onClick={() => spend(state.upgradeHackingDeck)} disabled={Boolean(state.nightActivity) || state.cash < HACKING_DECK_COSTS[state.hackingDeckLevel + 1]}>{state.hackingDeckLevel < 0 ? '구입' : '업그레이드'}</button></article>}
        {state.epilogue && <article className="night-entry smuggling-ticket"><img src={ticket.img} alt="" className="item-thumbnail" /><div><h3>{ticket.name}</h3><p>{ticket.description}</p><small>{money(ticket.price)} · 구매 즉시 우주로 도주합니다(되돌릴 수 없음)</small></div><button onClick={() => spend(() => state.buySmugglingTicket(ticket))} disabled={Boolean(state.nightActivity) || state.cash < ticket.price}>구입하고 탈출한다</button></article>}
        <article className="night-entry mining-machine">
          <img src="/imgs/items/mining_machine.png" alt="" className="item-thumbnail" />
          <div>
            <p className="eyebrow">DUST COIN MINING MODULE</p>
            <h3>마이닝 머신 {state.miningTier < 0 ? '미보유' : `T.${state.miningTier}`} <small>· 이번 주 한도 T.{tierLimit}</small></h3>
            <p>장 운영 중 DUST 코인을 생산합니다. T.0을 설치하면 다음 거래일부터 잠긴 암호자산 거래소가 열립니다.</p>
            <dl>
              <div><dt>현재 생산</dt><dd>{currentMiningRate.toFixed(4)} DUST/초</dd></div>
              <div><dt>{state.miningTier < 0 ? '설치 후' : `T.${nextMineTier(state.miningTier)} 생산`}</dt><dd>{upgradedMiningRate.toFixed(4)} DUST/초</dd></div>
              <div><dt>{state.miningTier < 0 ? '설치 비용' : '업그레이드 비용'}</dt><dd>{money(miningCost)}</dd></div>
            </dl>
            {canUpgrade
              ? <small className="mining-payback">현재 코인값 {money(coinPrice)} 기준 추가 생산분 회수 약 {paybackDays}거래일</small>
              : <small className="mining-payback">{state.cycle < 5 ? `${state.cycle + 1}주차에 다음 티어 해금` : '파일럿 최고 티어에 도달했습니다.'}</small>}
          </div>
          <button onClick={() => spend(state.upgradeMiningMachine)} disabled={Boolean(state.nightActivity) || state.cash < miningCost || !canUpgrade}>{canUpgrade ? (state.miningTier < 0 ? 'T.0 설치' : `T.${nextMineTier(state.miningTier)} 업그레이드`) : '업그레이드 잠김'}</button>
        </article>
      </div>}
      {tab === 'inventory' && <>{drinkCount > 0 ? <article className="night-entry"><img src={drink.img} alt="" className="item-thumbnail" /><div><h3>{drink.name} × {drinkCount}</h3><p>마시면 활동력을 아주 조금 회복한다.</p><small>활동력 +{drink.energyRestore}</small></div><button onClick={() => state.useNightItem(drink)} disabled={Boolean(state.nightActivity) || state.energy >= MAX_ENERGY}>마시기</button></article> : <p className="empty-state">인벤토리가 비어 있습니다.</p>}</>}
    </div>
    {state.nightActivity && <div className="activity-loading"><div className="loading-spinner" /><h3>{state.nightActivity.id === cyberRunner.id ? '시지프 내부망 침투 중…' : '편의점 야간 근무 중…'}</h3><p>{state.nightActivity.id === cyberRunner.id ? '추적 방화벽을 우회하고 자산 키를 복호화하는 중입니다.' : '재고 수량과 삶의 의미를 세는 중입니다.'}</p></div>}
    {state.nightMessage && <div className="night-dialogue"><p>{state.nightMessage}</p><button onClick={state.clearNightMessage}>확인</button></div>}
  </section>
}
