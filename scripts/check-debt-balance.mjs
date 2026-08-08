// 부채 시스템(B 구조) 밸런스를 빠르게 확인하는 개발용 스크립트.
// 매 주기 "최소 상환액만" 내는 최악의 경우를 시뮬레이션해, 6주차까지 살아남는지·
// 몇 주차에서 게임오버 임계값에 걸리는지 눈으로 확인할 때 쓴다.
// 사용법: node scripts/check-debt-balance.mjs
import { computeSettlement, getMinPayment } from '../src/logic/debtSystem.js'
import { INITIAL_DEBT, MAX_CYCLES } from '../src/config.js'

const money = (value) => `₡${Math.round(value).toLocaleString('ko-KR')}`

console.log(`최소 상환만 반복했을 때 (초기 부채 ${money(INITIAL_DEBT)}):\n`)

let debt = INITIAL_DEBT
for (let cycle = 1; cycle <= MAX_CYCLES; cycle += 1) {
  const minPayment = getMinPayment(debt, cycle)
  const result = computeSettlement(debt, cycle, minPayment)
  console.log(`${cycle}주차 | 부채 ${money(debt)} | 최소 상환액 ${money(minPayment)}`)
  if (result.cleared) { console.log(`  → ${cycle}주차에 완제(조기 클리어 또는 6주차 완주)`); break }
  if (result.gameOver) { console.log('  → 게임오버'); break }
  debt = result.debt
}
