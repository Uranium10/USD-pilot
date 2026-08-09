import { useEffect, useState } from 'react'
import { CHARACTERS } from '../data/storyScript.js'
import { useGameStore } from '../store/gameStore.js'

// gameStore.activeScene이 있을 때만 보이는 대화 연출 레이어. 좌/우 두 개의 초상화
// 슬롯을 두고, 지금까지 등장한 화자를 순서대로 배정한다 — 새 화자는 빈 슬롯(없으면
// 가장 오래 안 쓰인 슬롯)에 들어가고, 이미 등장했던 화자는 그 슬롯을 유지한다.
function computeSlots(lines, uptoIndex) {
  const slots = [null, null]
  let lastActiveIndex = null
  for (let i = 0; i <= uptoIndex; i++) {
    const speaker = lines[i]?.speaker
    if (!CHARACTERS[speaker]?.name) continue // 이름 없는 화자(나레이션)는 슬롯을 안 씀
    const existing = slots.indexOf(speaker)
    if (existing !== -1) { lastActiveIndex = existing; continue }
    const emptyIndex = slots.indexOf(null)
    if (emptyIndex !== -1) {
      slots[emptyIndex] = speaker
      lastActiveIndex = emptyIndex
    } else {
      const replaceIndex = lastActiveIndex === 0 ? 1 : 0
      slots[replaceIndex] = speaker
      lastActiveIndex = replaceIndex
    }
  }
  return { slots, activeIndex: lastActiveIndex }
}

function Portrait({ characterId, portraitKey, active }) {
  const [failed, setFailed] = useState(false)
  if (!characterId) return <div className="dialogue-portrait empty" aria-hidden="true" />
  const character = CHARACTERS[characterId]
  const src = portraitKey && character.portraits[portraitKey]
  return <div className={`dialogue-portrait ${active ? 'active' : 'dimmed'}`}>
    {src && !failed
      ? <img src={src} alt={character.name || ''} onError={() => setFailed(true)} />
      // 아트가 아직 없거나 로드 실패 시 이니셜 placeholder로 대체 — 나중에 실제
      // 이미지가 그 경로에 생기면 자동으로 교체된다.
      : <div className="dialogue-portrait-placeholder">{(character.name || '?').slice(0, 1)}</div>}
  </div>
}

export default function DialogueScene() {
  const activeScene = useGameStore((state) => state.activeScene)
  const closeScene = useGameStore((state) => state.closeScene)
  const [lineIndex, setLineIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [typingFinished, setTypingFinished] = useState(false)

  const lines = activeScene?.scene.lines || []
  const currentLine = lines[lineIndex]

  useEffect(() => {
    setLineIndex(0)
  }, [activeScene?.id])

  useEffect(() => {
    if (!currentLine) return undefined
    const text = currentLine.text
    const keyboard = new Audio('/sounds/KeyboardPress.mp3')
    keyboard.volume = 0.18
    let index = 0
    setTyped('')
    setTypingFinished(false)
    const interval = window.setInterval(() => {
      index += 1
      setTyped(text.slice(0, index))
      keyboard.currentTime = 0
      keyboard.play().catch(() => {})
      if (index >= text.length) {
        window.clearInterval(interval)
        setTypingFinished(true)
      }
    }, 45)
    return () => {
      window.clearInterval(interval)
      keyboard.pause()
    }
    // currentLine.text만 바뀌어도 다시 돌아야 하므로 lineIndex를 키로 쓴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene?.id, lineIndex])

  if (!activeScene || !currentLine) return null

  const advance = () => {
    if (!typingFinished) {
      setTyped(currentLine.text)
      setTypingFinished(true)
      return
    }
    if (lineIndex + 1 < lines.length) setLineIndex(lineIndex + 1)
    else closeScene()
  }

  const { slots, activeIndex } = computeSlots(lines, lineIndex)
  const speakerName = CHARACTERS[currentLine.speaker]?.name

  return <div className="dialogue-backdrop" onClick={advance} role="button" tabIndex={0}
    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') advance() }}>
    <div className="dialogue-portraits">
      <Portrait characterId={slots[0]} active={activeIndex === 0}
        portraitKey={slots[0] === currentLine.speaker ? currentLine.portrait : 'neutral'} />
      <Portrait characterId={slots[1]} active={activeIndex === 1}
        portraitKey={slots[1] === currentLine.speaker ? currentLine.portrait : 'neutral'} />
    </div>
    <div className="dialogue-box">
      {speakerName && <b className="dialogue-speaker">{speakerName}</b>}
      <p>{typed}{typingFinished && <span className="dialogue-next" aria-hidden="true">▼</span>}</p>
    </div>
  </div>
}
