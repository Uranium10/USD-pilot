import { DEBT_RATIO, FLOOR_BASE, FLOOR_GROWTH, INTEREST_RATE, MAX_CYCLES } from '../config.js'

// U.S.D 부채 시스템(B 구조). USD-spec/USD_작업지시서.md의 명세를 그대로 옮긴 순수 함수들이다.
//
// 두 축으로 나눈다:
// - 최소 상환액(minPayment): 매 주기 반드시 내야 하는 금액. 계속 오른다(압박 유지). 선상환과 무관.
// - 총 부채(debt): 갚아야 할 전체 원금. 상환한 만큼 줄고, 초과 상환(선상환)하면 더 줄어든다.
//
// 선상환의 보상은 "다음 상환액 감소"가 아니라 총 부채가 줄어 이자가 줄고, 후반이 편해지며,
// 완주(6주차)를 앞당기거나 부채가 조기에 바닥나 일찍 클리어되는 것으로 나타난다.

// 이번 주기의 최소 상환액. Math.max(부채 비례분, 상승 하한) — 하한이 매 주기 계속 오르므로
// 선상환으로 부채 비례분이 작아져도 압박이 유지된다.
export function getMinPayment(debt, cycle) {
  const proportional = Math.round(debt * DEBT_RATIO)
  const floor = Math.round(FLOOR_BASE * FLOOR_GROWTH ** (cycle - 1))
  return Math.max(proportional, floor)
}

// 주기 말 정산. payAmount는 플레이어가 실제로 낸 금액(선상환 포함 가능)이다.
// 반환값:
// - { gameOver: true } — 최소 상환액 미달
// - { cleared: true }  — 부채 전액 상환(6주차 전 조기 클리어 포함) 또는 6주차 완주
// - { debt, nextCycle } — 다음 주기로 진행 (남은 부채에 이자가 붙은 상태)
export function computeSettlement(debt, cycle, payAmount) {
  const minPayment = getMinPayment(debt, cycle)

  if (payAmount < minPayment) return { gameOver: true }

  let remaining = debt - payAmount
  if (remaining <= 0) return { cleared: true }

  remaining = Math.round(remaining * (1 + INTEREST_RATE))

  if (cycle >= MAX_CYCLES) return { cleared: true }

  return { debt: remaining, nextCycle: cycle + 1, gameOver: false, cleared: false }
}
