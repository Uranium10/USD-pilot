import { DAY_DURATION_SECONDS, MARKET_OPEN_MINUTE, MARKET_SESSION_MINUTES } from '../config.js'

// 게임 내 장 시계. 낮 스테이지의 실시간 길이가 얼마든, 표시되는 시각은 개장~마감 구간에
// 선형으로 매핑된다. 작업표시줄 시계·속보 발표 시각·차트 시간축이 전부 이 함수를 쓴다.
//
// 2026-08-10에 한곳으로 모았다. 이전에는 작업표시줄과 속보만 장 시계(09:00 기준)를 쓰고
// 차트 시간축은 실시간 경과 초를 그대로 보여줘서(`1일 2:30`) 같은 화면이 서로 다른 두
// 시간을 말하고 있었다.

// 하루 진행률(0~1) → 'HH:MM'
export function formatMarketTime(progress) {
  const clamped = Math.min(1, Math.max(0, Number(progress) || 0))
  const totalMinutes = MARKET_OPEN_MINUTE + clamped * MARKET_SESSION_MINUTES
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.floor(totalMinutes % 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// 낮 스테이지 경과 초 → 'HH:MM'
export function formatMarketTimeFromElapsed(elapsedSeconds) {
  return formatMarketTime((Number(elapsedSeconds) || 0) / DAY_DURATION_SECONDS)
}
