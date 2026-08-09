import { useEffect, useRef, useState } from 'react'
import { bgmPlayer } from '../services/bgmService.js'
import { useGameStore } from '../store/gameStore.js'

function SpeakerIcon() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 12h6l7-6v20l-7-6H4z" /><path className="sound-wave" d="M21 11c2 2 2 8 0 10M25 8c5 5 5 11 0 16" /><path className="mute-mark" d="m21 12 7 8m0-8-7 8" /></svg>
}

export default function BgmController() {
  const phase = useGameStore((state) => state.phase)
  const mode = phase === 'premarket' || phase === 'day' || phase === 'dayReport' ? 'chart' : phase === 'night' ? 'night' : null
  const [volume, setVolume] = useState(() => bgmPlayer.getVolume())
  const [muted, setMuted] = useState(() => bgmPlayer.isMuted())
  const [expanded, setExpanded] = useState(false)
  const sliderRef = useRef(null)
  const draggingRef = useRef(false)
  const focusWithinRef = useRef(false)
  const closeTimerRef = useRef(null)

  useEffect(() => { bgmPlayer.setMode(mode) }, [mode])
  useEffect(() => {
    const unlock = () => bgmPlayer.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), [])

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
    bgmPlayer.setVolume(nextVolume)
    if (bgmPlayer.isMuted()) bgmPlayer.setMuted(false)
    setMuted(false)
    setVolume(nextVolume)
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
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
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
    <button type="button" className="bgm-launch" aria-label="볼륨 조절 열기" onClick={() => { cancelClose(); setExpanded(true) }}><SpeakerIcon /></button>
    <aside className={`bgm-volume ${expanded ? 'expanded' : 'collapsed'} ${muted ? 'muted' : ''}`} aria-label="배경음악 볼륨" onMouseEnter={cancelClose} onMouseLeave={scheduleClose} onFocusCapture={() => { focusWithinRef.current = true; cancelClose() }} onBlurCapture={() => { focusWithinRef.current = false; scheduleClose() }}>
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
      onPointerCancel={stopDrag}
      onKeyDown={changeByKeyboard}
      >
        {Array.from({ length: 12 }, (_, index) => <span key={index} className={index < filledSegments ? 'filled' : ''} />)}
      </div>
      <output>{Math.round(volume * 100)}</output>
      <button type="button" className="bgm-mute" aria-label={muted ? '배경음악 음소거 해제' : '배경음악 음소거'} aria-pressed={muted} onClick={toggleMute}><SpeakerIcon /></button>
    </aside>
  </div>
}
