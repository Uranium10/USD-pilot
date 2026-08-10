const MODIFIERS = [
  { id: 'liquidity-control', name: '유동성 규제', headline: '궤도 거래위원회, 단일 종목 집중투자 제한 시행', detail: '한 종목에는 총자산의 60%까지만 투자할 수 있습니다. 정보 가격은 15% 인하됩니다.', tarae: '몰빵은 막아 놓고 정보는 싸게 푼다... 분산투자 강제 체험판이네.', effects: { maxPositionRatio: 0.6, rumorCostMultiplier: 0.85 } },
  { id: 'power-rationing', name: '전력 배급', headline: '궤도 전력청, 산업용 전력 순환 배급 발표', detail: 'DUST 채굴량이 25% 감소합니다. 마이닝 머신 설치·업그레이드 비용은 20% 인하됩니다.', tarae: '캐는 건 느려졌는데 기계는 싸졌어. 장기 투자하라는 전력청의 계시인가?', effects: { miningRateMultiplier: 0.75, miningUpgradeCostMultiplier: 0.8 } },
  { id: 'information-crackdown', name: '정보 단속', headline: '시장감독국, 미인가 정보 채널 집중 단속', detail: '하루에 정보 2건까지만 구입할 수 있습니다. 정보 가격은 25% 인하됩니다.', tarae: '두 개만 고르라고? 싸게 팔아도 틀린 걸 고르면 그냥 할인된 파산인데.', effects: { maxRumorsPerDay: 2, rumorCostMultiplier: 0.75 } },
  { id: 'night-curfew', name: '야간 통행 제한', headline: '치안국, 야간 통행 허가제 한시 시행', detail: '야간 활동력 소모가 25% 증가합니다. 크레딧 활동 보상은 30% 증가합니다.', tarae: '밖에 나가는 것부터 위험수당이 붙네. 이 도시는 상식도 유료야.', effects: { nightEnergyCostMultiplier: 1.25, nightRewardMultiplier: 1.3 } },
  { id: 'supply-shortage', name: '생활물자 부족', headline: '외곽 보급선 지연, 생활물자 가격 일제 상승', detail: '상점 가격이 20% 상승합니다. 크레딧 활동 보상은 25% 증가합니다.', tarae: '햄버거도 비싸지고 야근값도 올랐어. 물가와 노동이 사이좋게 망가지는 중.', effects: { shopPriceMultiplier: 1.2, nightRewardMultiplier: 1.25 } },
]

const hash = (value) => {
  let result = 2166136261
  for (const char of String(value)) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619) }
  return result >>> 0
}

export function chooseWeeklyModifier(cycle, seed, previousId = null) {
  if (cycle <= 1 || cycle >= 7) return null
  const candidates = MODIFIERS.filter((modifier) => modifier.id !== previousId)
  return candidates[hash(`${seed}:${cycle}:weekly-modifier`) % candidates.length]
}

export const getWeeklyModifier = (id) => MODIFIERS.find((modifier) => modifier.id === id) || null
export const modifierEffect = (id, key, fallback = 1) => getWeeklyModifier(id)?.effects?.[key] ?? fallback
export const modifiedRumorCost = (rumor, id) => Math.max(0, Math.round(rumor.cost * modifierEffect(id, 'rumorCostMultiplier')))
export const modifiedMiningCost = (cost, id) => Math.max(0, Math.round(cost * modifierEffect(id, 'miningUpgradeCostMultiplier') * modifierEffect(id, 'shopPriceMultiplier')))
export const modifiedShopPrice = (price, id) => Math.max(0, Math.round(price * modifierEffect(id, 'shopPriceMultiplier')))
export const modifiedNightEnergyCost = (cost, id) => Math.max(0, Math.ceil(cost * modifierEffect(id, 'nightEnergyCostMultiplier') / 5) * 5)
export const modifiedNightReward = (reward, id) => Math.max(0, Math.round(reward * modifierEffect(id, 'nightRewardMultiplier')))

export const weeklyModifierScene = (modifier) => ({
  background: null,
  lines: [
    { speaker: 'system', sound: '/sounds/Message_1.mp3', soundVolume: 0.5, text: `[이번 주 속보] ${modifier.headline}\n${modifier.detail}` },
    { speaker: 'tarae', portrait: 'neutral', text: modifier.tarae },
  ],
})
