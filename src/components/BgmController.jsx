import { useEffect, useRef, useState } from 'react'
import { bgmPlayer } from '../services/bgmService.js'
import { useGameStore } from '../store/gameStore.js'

function SpeakerIcon() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 12h6l7-6v20l-7-6H4z" /><path className="sound-wave" d="M21 11c2 2 2 8 0 10M25 8c5 5 5 11 0 16" /><path className="mute-mark" d="m21 12 7 8m0-8-7 8" /></svg>
}

export default function BgmController() {
  const phase = useGameStore((state) => state.phase)
  const screen = useGameStore((state) => state.screen)
  const mode = screen === 'title' ? 'title' : phase === 'premarket' || phase === 'day' || phase === 'dayReport' ? 'chart' : phase === 'night' ? 'night' : null
  const roomBandpass = screen === 'room' && (phase === 'premarket' || phase === 'day' || phase === 'dayReport')
  const [volume, setVolume] = useState(() => bgmPlayer.getVolume())
  const [muted, setMuted] = useState(() => bgmPlayer.isMuted())
  const [expanded, setExpanded] = useState(false)
  const sliderRef = useRef(null)
  const draggingRef = useRef(false)
  const focusWithinRef = useRef(false)
  const closeTimerRef = useRef(null)
  const renderFrameRef = useRef(null)

  useEffect(() => { bgmPlayer.setMode(mode) }, [mode])
  useEffect(() => { bgmPlayer.setRoomFilter(roomBandpass) }, [roomBandpass])

  useEffect(() => () => {
    window.clearTimeout(closeTimerRef.current)
    window.cancelAnimationFrame(renderFrameRef.current)
  }, [])

  const cancelClose = () => window.clearTimeout(closeTimerRef.current)
  const scheduleClose = () => {
    cancelClose()
    if (draggingRef.current || focusWithinRef.current) return
    closeTimerRef.current = window.setTimeout(() => setExpanded(false), 1200)
  }

  const updateFromPointer = (clientY) => {
    const rect = sliderRef.current?.getBoundingClientRect()
    if (!rect?.height) return
    const nextVolume = Math.min(1, Math.max(0, (rect.bottom - clientY) / rect.height))
    // 포인터 이동 중에는 오디오만 즉시 반영한다. 매 이벤트마다 localStorage와
    // React 렌더링까지 수행하면 특히 Firefox에서 슬라이더가 끊겨 보일 수 있다.
    bgmPlayer.setVolume(nextVolume, { persist: false })
    if (bgmPlayer.isMuted()) bgmPlayer.setMuted(false)
    setMuted(false)
    window.cancelAnimationFrame(renderFrameRef.current)
    renderFrameRef.current = window.requestAnimationFrame(() => setVolume(nextVolume))
    return nextVolume
  }
  const startDrag = (event) => {
    cancelClose()
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(event.clientY)
  }
  const moveDrag = (event) => {
    if (draggingRef.current) updateFromPointer(event.clientY)
  }
  const stopDrag = (event) => {
    const finalVolume = updateFromPointer(event.clientY)
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (finalVolume !== undefined) {
      bgmPlayer.setVolume(finalVolume)
      setVolume(finalVolume)
    }
    scheduleClose()
  }
  const cancelDrag = (event) => {
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    bgmPlayer.setVolume(bgmPlayer.getVolume())
    scheduleClose()
  }
  const changeByKeyboard = (event) => {
    let nextVolume = volume
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') nextVolume += 0.05
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') nextVolume -= 0.05
    else if (event.key === 'Home') nextVolume = 0
    else if (event.key === 'End') nextVolume = 1
    else return
    event.preventDefault()
    nextVolume = Math.min(1, Math.max(0, nextVolume))
    bgmPlayer.setVolume(nextVolume)
    bgmPlayer.setMuted(false)
    setVolume(nextVolume)
    setMuted(false)
  }
  const toggleMute = () => setMuted(bgmPlayer.toggleMuted())
  const filledSegments = muted ? 0 : Math.ceil(volume * 12)

  return <div className={`bgm-control ${muted ? 'muted' : ''}`}>
    <button type="button" className="bgm-launch" aria-label="볼륨 조절 열기" onClick={() => { setExpanded(true); scheduleClose() }}><SpeakerIcon /></button>
    <aside className={`bgm-volume ${expanded ? 'expanded' : 'collapsed'} ${muted ? 'muted' : ''}`} aria-label="배경음악 볼륨" onMouseMove={cancelClose} onMouseLeave={scheduleClose} onFocusCapture={() => { focusWithinRef.current = true; cancelClose() }} onBlurCapture={() => { focusWithinRef.current = false; scheduleClose() }}>
      <div
      ref={sliderRef}
      className="bgm-volume-slider"
      role="slider"
      tabIndex="0"
      aria-label="배경음악 볼륨"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(volume * 100)}
      aria-valuetext={muted ? `음소거, 설정 볼륨 ${Math.round(volume * 100)}%` : `${Math.round(volume * 100)}%`}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={cancelDrag}
      onKeyDown={changeByKeyboard}
      >
        {Array.from({ length: 12 }, (_, index) => <span key={index} className={index < filledSegments ? 'filled' : ''} />)}
      </div>
      <output>{Math.round(volume * 100)}</output>
      <button type="button" className="bgm-mute" aria-label={muted ? '배경음악 음소거 해제' : '배경음악 음소거'} aria-pressed={muted} onClick={toggleMute}><SpeakerIcon /></button>
    </aside>
  </div>
}
