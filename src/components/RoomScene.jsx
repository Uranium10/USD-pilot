import { useEffect, useMemo, useState } from 'react'
import { getNetWorth, useGameStore } from '../store/gameStore.js'
import SpriteAnimator from './SpriteAnimator.jsx'

function FloatingNotes() {
  return (
    <div className="floating-notes-container">
      <img src="/imgs/bg/music_note.png" className="note note-1" alt="" aria-hidden="true" />
      <img src="/imgs/bg/music_note.png" className="note note-2" alt="" aria-hidden="true" />
      <img src="/imgs/bg/music_note.png" className="note note-3" alt="" aria-hidden="true" />
    </div>
  )
}

// 방 배경은 Tarae 아트 3장(눈 뜸/반쯤 감음/완전히 감음)을 SpriteAnimator로 재생해
// 자연스러운 깜빡임을 흉내낸다. 평소엔 눈 뜬 프레임에 멈춰 있다가, 무작위 간격으로
// 반쯤→완전히→반쯤→뜸 4프레임을 한 번(loop 없이) 재생하고 다시 멈춘다.
const frameUrl = (set, frame) => `/imgs/bg/Tarae/room_${set}_${frame}.png`
const BLINK_FPS = 14
const HAPPY_GROWTH_RATIO = 0.1 // 전날 대비 총자산이 10% 이상 늘었을 때 웃는 얼굴로 바꾼다.
const ALL_ROOM_IMAGES = [
  ...['day', 'night'].flatMap((set) => [1, 2, 3].map((frame) => frameUrl(set, frame))),
  frameUrl('day', 'smile'),
]

// 쉬는 프레임/깜빡임 프레임으로 전환할 때마다 SpriteAnimator가 새로 마운트되면서
// <img>가 처음 보는 src를 만나면(브라우저가 아직 못 받아온 이미지) 한 프레임 정도
// 빈 화면이 비치는 "깜빡임"이 생긴다. 여섯 장을 미리 받아 디코드해두면 이후의 모든
// 프레임 전환은 캐시에서 바로 그려져 이 현상이 사라진다.
function usePreloadRoomImages() {
  useEffect(() => {
    ALL_ROOM_IMAGES.forEach((url) => { const image = new Image(); image.src = url })
  }, [])
}

function useBlink(set, isHappy) {
  const [blinking, setBlinking] = useState(false)

  useEffect(() => {
    if (isHappy || blinking) return undefined
    const timer = window.setTimeout(() => setBlinking(true), 2600 + Math.random() * 3400)
    return () => window.clearTimeout(timer)
  }, [set, blinking, isHappy])

  const finishBlink = useMemo(() => () => setBlinking(false), [])
  return [blinking, finishBlink]
}

// 밤(및 밤 직후 정산)에는 야경 세트, 그 외에는 낮 세트를 쓴다.
const isNightPhase = (phase) => phase === 'night' || phase === 'settlement'

export default function RoomScene({ children }) {
  const phase = useGameStore((state) => state.phase)
  const showMonitorHint = useGameStore((state) => state.showMonitorHint)
  const openMonitor = useGameStore((state) => state.openMonitor)
  const endNight = useGameStore((state) => state.endNight)
  const nightActivity = useGameStore((state) => state.nightActivity)
  const hasTeddyBear = useGameStore((state) => (state.inventory['teddy-bear'] || 0) > 0)
  const netWorth = useGameStore(getNetWorth)
  const previousSummary = useGameStore((state) => state.dailySummaries.at(-1))
  const set = isNightPhase(phase) ? 'night' : 'day'
  // 전날 마감 총자산 대비 지금 총자산이 10% 이상 늘었으면 낮 쉬는 프레임을 웃는 얼굴로 바꾼다.
  // 아직 완결된 "전날"이 없으면(1주차 1일차) 비교 기준이 없으니 평소 표정을 쓴다.
  const isHappy = Boolean(previousSummary) && previousSummary.netWorth > 0
    && (netWorth - previousSummary.netWorth) / previousSummary.netWorth >= HAPPY_GROWTH_RATIO
  const [blinking, finishBlink] = useBlink(set, isHappy)
  usePreloadRoomImages()
  // 낮 동안(정보 구매·거래·일일 보고서)에는 모니터를 눌러 거래소를 열 수 있다.
  // 로딩 중엔 아직 시장이 없고, 밤/정산 중엔 상호작용이 NightPanel/Settlement로 넘어간다.
  const canOpenMonitor = phase === 'premarket' || phase === 'day' || phase === 'dayReport'
  const restFrames = useMemo(
    () => [set === 'day' && isHappy ? frameUrl('day', 'smile') : frameUrl(set, 1)],
    [set, isHappy],
  )
  const blinkFrames = useMemo(() => [2, 3, 2, 1].map((frame) => frameUrl(set, frame)), [set])

  return (
    <main className="room">
      <SpriteAnimator
        key={`rest-${set}`}
        type="frames"
        src={restFrames}
        width="100%"
        height="100%"
        className="room-art"
        style={{ opacity: blinking ? 0 : 1 }}
      />
      <SpriteAnimator
        key={`blink-${set}`}
        type="frames"
        src={blinkFrames}
        width="100%"
        height="100%"
        fps={BLINK_FPS}
        loop={false}
        playing={blinking}
        onComplete={finishBlink}
        className="room-art"
        style={{ opacity: blinking ? 1 : 0 }}
      />
      {hasTeddyBear && (
        <svg className={`room-props ${set}`} viewBox="0 0 1024 768" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <image className="room-teddy-bear" href="/imgs/bg/Tarae/Bear.png" x="806" y="294" width="94" height="141" preserveAspectRatio="xMidYMid meet" />
        </svg>
      )}
      {set === 'day' && isHappy && <FloatingNotes />}
      {phase === 'loading' && <p className="room-loading-text">궤도 시장을 도청하는 중…</p>}
      {canOpenMonitor && (
        <button className={`monitor-hotspot ${showMonitorHint ? 'first-monitor-visit' : ''}`} onClick={openMonitor} aria-label="모니터 켜기">
          <span className="monitor-hint">{showMonitorHint ? 'CLICK TO START' : '화면 보기'}</span>
        </button>
      )}
      {phase === 'night' && (
        <button className="sleep-button" data-night-tutorial-target="sleep" onClick={endNight} disabled={Boolean(nightActivity)}>하루 종료</button>
      )}
      {children}
    </main>
  )
}
