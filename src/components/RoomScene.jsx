import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import SpriteAnimator from './SpriteAnimator.jsx'

// 방 배경은 Tarae 아트 3장(눈 뜸/반쯤 감음/완전히 감음)을 SpriteAnimator로 재생해
// 자연스러운 깜빡임을 흉내낸다. 평소엔 눈 뜬 프레임에 멈춰 있다가, 무작위 간격으로
// 반쯤→완전히→반쯤→뜸 4프레임을 한 번(loop 없이) 재생하고 다시 멈춘다.
const frameUrl = (set, frame) => `/imgs/bg/Tarae/room_${set}_${frame}.png`
const BLINK_FPS = 14

function useBlink(set) {
  const [blinking, setBlinking] = useState(false)

  useEffect(() => {
    // 깜빡이는 동안엔 새 타이머를 걸지 않는다 — SpriteAnimator의 onComplete(finishBlink)가 끝내준다.
    if (blinking) return undefined
    const timer = window.setTimeout(() => setBlinking(true), 2600 + Math.random() * 3400)
    return () => window.clearTimeout(timer)
  }, [set, blinking])

  return [blinking, () => setBlinking(false)]
}

// 밤(및 밤 직후 정산)에는 야경 세트, 그 외에는 낮 세트를 쓴다.
const isNightPhase = (phase) => phase === 'night' || phase === 'settlement'

export default function RoomScene({ children }) {
  const phase = useGameStore((state) => state.phase)
  const setScreen = useGameStore((state) => state.setScreen)
  const set = isNightPhase(phase) ? 'night' : 'day'
  const [blinking, finishBlink] = useBlink(set)
  // 낮 동안(정보 구매·거래·일일 보고서)에는 모니터를 눌러 거래소를 열 수 있다.
  // 로딩 중엔 아직 시장이 없고, 밤/정산 중엔 상호작용이 NightPanel/Settlement로 넘어간다.
  const canOpenMonitor = phase === 'premarket' || phase === 'day' || phase === 'dayReport'

  return (
    <main className="room">
      {blinking
        ? <SpriteAnimator key={`blink-${set}`} type="frames" src={[2, 3, 2, 1].map((frame) => frameUrl(set, frame))} width="100%" height="100%" fps={BLINK_FPS} loop={false} onComplete={finishBlink} className="room-art" />
        : <SpriteAnimator key={`rest-${set}`} type="frames" src={[frameUrl(set, 1)]} width="100%" height="100%" className="room-art" />}
      {phase === 'loading' && <p className="room-loading-text">궤도 시장을 도청하는 중…</p>}
      {canOpenMonitor && (
        <button className="monitor-hotspot" onClick={() => setScreen('monitor')} aria-label="모니터 켜기">
          <span className="monitor-hint">화면 보기</span>
        </button>
      )}
      {children}
    </main>
  )
}
