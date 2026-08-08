import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'

// 방 배경은 Tarae 아트 3장(눈 뜸/반쯤 감음/완전히 감음)을 돌려가며 자연스러운 깜빡임을 흉내낸다.
// 평소엔 눈 뜬 프레임(1)을 유지하다가, 무작위 간격으로 반쯤→완전히→반쯤→뜸 순서로 짧게 깜빡인다.
function useBlinkFrame() {
  const [frame, setFrame] = useState(1)
  useEffect(() => {
    let timer
    const scheduleIdle = () => {
      timer = window.setTimeout(() => {
        setFrame(2)
        timer = window.setTimeout(() => {
          setFrame(3)
          timer = window.setTimeout(() => {
            setFrame(2)
            timer = window.setTimeout(() => {
              setFrame(1)
              scheduleIdle()
            }, 90)
          }, 120)
        }, 90)
      }, 2600 + Math.random() * 3400)
    }
    scheduleIdle()
    return () => window.clearTimeout(timer)
  }, [])
  return frame
}

// 밤(및 밤 직후 정산)에는 야경 세트, 그 외에는 낮 세트를 쓴다.
const isNightPhase = (phase) => phase === 'night' || phase === 'settlement'

export default function RoomScene({ children }) {
  const phase = useGameStore((state) => state.phase)
  const setScreen = useGameStore((state) => state.setScreen)
  const frame = useBlinkFrame()
  const background = `/imgs/bg/Tarae/room_${isNightPhase(phase) ? 'night' : 'day'}_${frame}.png`
  // 낮 동안(정보 구매·거래·일일 보고서)에는 모니터를 눌러 거래소를 열 수 있다.
  // 로딩 중엔 아직 시장이 없고, 밤/정산 중엔 상호작용이 NightPanel/Settlement로 넘어간다.
  const canOpenMonitor = phase === 'premarket' || phase === 'day' || phase === 'dayReport'

  return (
    <main className="room" style={{ backgroundImage: `url(${background})` }}>
      {phase === 'loading' && <p className="room-loading-text">궤도 시장을 도청하는 중…</p>}
      {canOpenMonitor && <button className="monitor-hotspot" onClick={() => setScreen('monitor')} aria-label="모니터 켜기" />}
      {children}
    </main>
  )
}
