import { useEffect, useState } from 'react'
import { COIN_ASSET_ID, COIN_REFERENCE_PRICE, CYBER_RUNNER_ENERGY_COST, DAY_DURATION_SECONDS, HACKING_DECK_COSTS, MAX_ENERGY } from '../config.js'
import { NIGHT_ACTIVITIES, NIGHT_ITEMS } from '../data/nightContent.js'
import { canUpgradeMine, maxMineTier, minePaybackSeconds, mineRate, mineUpgradeCost, nextMineTier } from '../logic/miningSystem.js'
import { getNightActivity, getNightActivityOptions, nightActivityCashCost } from '../logic/nightActivities.js'
import { playCashOut, playCashRegister } from '../services/audioService.js'
import { useGameStore } from '../store/gameStore.js'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`

export default function NightPanel() {
  const state = useGameStore()
  const [tab, setTab] = useState('activity')
  const drink = NIGHT_ITEMS.chiliEnergy
  const inventoryItems = Object.values(NIGHT_ITEMS).filter((item) => (state.inventory[item.id] || 0) > 0)
  const ticket = NIGHT_ITEMS.smugglingTicket
  const deck = NIGHT_ITEMS.hackingDeck
  const cyberRunner = NIGHT_ACTIVITIES.cyberRunner
  const activityOptions = getNightActivityOptions(state.cycle, state.day, state.market?.seed, state.donationSchedule)
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
    if (!activityId) return undefined
    const complete = activityId === cyberRunner.id ? state.completeCyberRunner : state.completeNightActivity
    const timer = window.setTimeout(() => { const result = complete(); if (result?.cashEarned > 0) playCashRegister() }, 1400)
    return () => window.clearTimeout(timer)
  }, [cyberRunner.id, state.completeCyberRunner, state.completeNightActivity, state.nightActivity?.id])

  if (state.phase !== 'night') return null
  const inventoryCount = inventoryItems.reduce((total, item) => total + (state.inventory[item.id] || 0), 0)
  const spend = (action) => { const result = action(); if (result) playCashOut(); return result }

  return <section className="night-desktop">
    <header><div><p className="eyebrow">NIGHT SHIFT</p><h2>{state.cycle}주차 {state.day}일차 밤</h2></div><div className="energy-meter"><span>활동력 {state.energy}/{MAX_ENERGY}</span><progress max={MAX_ENERGY} value={state.energy} /></div></header>
    <nav className="night-tabs" data-night-tutorial-target="tabs">
      <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>활동</button>
      <button className={tab === 'shop' ? 'active' : ''} onClick={() => setTab('shop')}>상점</button>
      <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>인벤토리 ({inventoryCount})</button>
    </nav>
    <div className="night-content">
      {tab === 'activity' && <>
        {activityOptions.map((activity, index) => {
          const completed = state.completedNightActivityIds.includes(activity.id)
          const cashCost = nightActivityCashCost(activity, state.donationCount)
          const reward = activity.reward.type === 'donation'
            ? `기부금 ${money(cashCost)}`
            : activity.reward.type === 'credits'
            ? `보상 ${money(activity.reward.amount)}`
            : activity.reward.type === 'mixed'
              ? `기본 보상 ${money(activity.reward.credits)}`
              : '뜻밖의 발견 가능'
          const start = () => { const started = state.startNightActivity(activity.id); if (started && cashCost > 0) playCashOut() }
          return <article key={activity.id} className="night-entry" {...(index === 0 ? { 'data-night-tutorial-target': 'activity' } : {})}><img src={activity.img} alt="" className="item-thumbnail" /><div><h3>{activity.name}</h3><p>{activity.description}</p><small>활동력 -{activity.energyCost} · {reward}</small></div><button onClick={start} disabled={Boolean(state.nightActivity) || completed || state.energy < activity.energyCost || state.cash < cashCost}>{completed ? '오늘 완료' : activity.actionLabel}</button></article>
        })}
        {state.hackingDeckLevel >= 0 && <article className="night-entry cyber-runner"><img src={cyberRunner.img} alt="" className="item-thumbnail" /><div><h3>{cyberRunner.name}</h3><p>{cyberRunner.description}</p><small>덱 v.{state.hackingDeckLevel} · 활동력 -{CYBER_RUNNER_ENERGY_COST} · 크레딧/DUST/시지프 주식 중 무작위 획득</small></div><button onClick={state.startCyberRunner} disabled={Boolean(state.nightActivity) || state.completedNightActivityIds.includes(cyberRunner.id) || state.energy < CYBER_RUNNER_ENERGY_COST}>{state.completedNightActivityIds.includes(cyberRunner.id) ? '오늘 완료' : '침투 시작'}</button></article>}
      </>}
      {tab === 'shop' && <div className="night-shop-list">
        <article className="night-entry"><img src={drink.img} alt="" className="item-thumbnail" /><div><h3>{drink.name}</h3><p>{drink.description}</p><small>{money(drink.price)} (하루 2개 제한, {2 - (state.dailyDrinkPurchased || 0)}개 남음)</small></div><button onClick={() => spend(() => state.buyNightItem(drink))} disabled={Boolean(state.nightActivity) || state.cash < drink.price || state.dailyDrinkPurchased >= 2}>구입</button></article>
        {state.hackingDeckLevel < HACKING_DECK_COSTS.length - 1 && <article className="night-entry hacking-deck"><img src={`/imgs/items/hacking_deck_${Math.max(0, state.hackingDeckLevel + 1)}.png`} alt="" className="item-thumbnail" /><div><h3>{state.hackingDeckLevel < 0 ? deck.name : `해킹 덱 v.${state.hackingDeckLevel + 1} 개조`}</h3><p>{deck.description}</p><small>{money(HACKING_DECK_COSTS[state.hackingDeckLevel + 1])} · 보상량 배율 ×{state.hackingDeckLevel + 2}</small></div><button onClick={() => spend(state.upgradeHackingDeck)} disabled={Boolean(state.nightActivity) || state.cash < HACKING_DECK_COSTS[state.hackingDeckLevel + 1]}>{state.hackingDeckLevel < 0 ? '구입' : '업그레이드'}</button></article>}
        {state.epilogue && <article className="night-entry smuggling-ticket"><img src={ticket.img} alt="" className="item-thumbnail" /><div><h3>{ticket.name}</h3><p>{ticket.description}</p><small>{money(ticket.price)} · 구매 즉시 우주로 도주합니다(되돌릴 수 없음)</small></div><button onClick={() => spend(() => state.buySmugglingTicket(ticket))} disabled={Boolean(state.nightActivity) || state.cash < ticket.price}>구입하고 탈출한다</button></article>}
        <article className="night-entry mining-machine">
          <img src={`/imgs/items/mining_machine_${canUpgrade ? nextMineTier(state.miningTier) : Math.max(0, state.miningTier)}.png`} alt="" className="item-thumbnail" />
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
      {tab === 'inventory' && <>{inventoryCount > 0 ? inventoryItems.map((item) => {
        const count = state.inventory[item.id] || 0
        return <article key={item.id} className={`night-entry ${item.collectible ? 'collectible-item' : ''}`}>{item.img ? <img src={item.img} alt="" className="item-thumbnail" /> : <span className="item-thumbnail collectible-icon" aria-hidden="true">{item.icon}</span>}<div><h3>{item.name}{count > 1 ? ` × ${count}` : ''}</h3><p>{item.description}</p><small>{item.collectible ? '세션 한정 수집품' : `활동력 +${item.energyRestore}`}</small></div>{!item.collectible && <button onClick={() => state.useNightItem(item)} disabled={Boolean(state.nightActivity) || state.energy >= MAX_ENERGY}>마시기</button>}</article>
      }) : <p className="empty-state">인벤토리가 비어 있습니다.</p>}</>}
    </div>
    {state.nightActivity && (() => { const activity = getNightActivity(state.nightActivity.id); return <div className="activity-loading"><div className="loading-spinner" /><h3>{activity?.loadingTitle || '시지프 내부망 침투 중…'}</h3><p>{activity?.loadingText || '추적 방화벽을 우회하고 자산 키를 복호화하는 중입니다.'}</p></div> })()}
    {state.nightMessage && <div className="night-dialogue"><p>{state.nightMessage}</p><button onClick={state.clearNightMessage}>확인</button></div>}
  </section>
}
