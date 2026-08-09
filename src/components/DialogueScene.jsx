import { useEffect, useMemo, useRef, useState } from 'react'
import { CHARACTERS } from '../data/storyScript.js'
import { parseDialogueBold, renderDialogueTemplate } from '../logic/dialogueTemplate.js'
import { useGameStore } from '../store/gameStore.js'

// 좌/우 슬롯은 캐릭터의 side(또는 대사의 side)를 따른다. 같은 쪽에 새 인물이
// 끼어들면 그 슬롯의 인물과 교체하고, 각 슬롯은 마지막으로 사용한 표정을 유지한다.
function computePortraitState(lines, uptoIndex) {
  const slots = [null, null]
  let activeIndex = null
  for (let i = 0; i <= uptoIndex; i++) {
    const line = lines[i]
    const character = CHARACTERS[line?.speaker]
    if (!character?.name) {
      if (i === uptoIndex) activeIndex = null
      continue
    }

    const existingIndex = slots.findIndex((slot) => slot?.characterId === line.speaker)
    const declaredSide = line.side || character.side
    const declaredIndex = declaredSide === 'right' ? 1 : declaredSide === 'left' ? 0 : -1
    const emptyIndex = slots.findIndex((slot) => slot === null)
    const targetIndex = declaredIndex !== -1
      ? declaredIndex
      : existingIndex !== -1
        ? existingIndex
        : emptyIndex !== -1 ? emptyIndex : 0

    // 대사에서 위치가 바뀐 기존 인물은 이전 슬롯에 중복으로 남기지 않는다.
    if (existingIndex !== -1 && existingIndex !== targetIndex) slots[existingIndex] = null
    const previousPortrait = slots[targetIndex]?.characterId === line.speaker
      ? slots[targetIndex].portraitKey
      : null
    slots[targetIndex] = {
      characterId: line.speaker,
      portraitKey: line.portrait || previousPortrait || 'neutral',
    }
    if (i === uptoIndex) activeIndex = targetIndex
  }
  return { slots, activeIndex }
}

function Portrait({ slot, side, active }) {
  const characterId = slot?.characterId
  const portraitKey = slot?.portraitKey
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [characterId, portraitKey])
  if (!characterId) return <div className={`dialogue-portrait ${side} empty`} aria-hidden="true" />
  const character = CHARACTERS[characterId]
  const src = portraitKey && character.portraits[portraitKey]
  return <div className={`dialogue-portrait ${side} ${active ? 'active' : 'dimmed'}`}>
    {src && !failed
      ? <img src={src} alt={character.name || ''} draggable="false" onError={() => setFailed(true)} />
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
  const typingIntervalRef = useRef(null)
  const typingAudioRef = useRef(null)

  const lines = activeScene?.scene.lines || []
  const currentLine = lines[lineIndex]
  const renderedText = useMemo(() => renderDialogueTemplate(
    currentLine?.text || '',
    useGameStore.getState(),
  ), [currentLine])

  useEffect(() => {
    setLineIndex(0)
  }, [activeScene?.id])

  useEffect(() => {
    if (!currentLine) return undefined
    const text = renderedText
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
        typingIntervalRef.current = null
        keyboard.pause()
        setTypingFinished(true)
      }
    }, 45)
    typingIntervalRef.current = interval
    typingAudioRef.current = keyboard
    return () => {
      window.clearInterval(interval)
      keyboard.pause()
      if (typingIntervalRef.current === interval) typingIntervalRef.current = null
      if (typingAudioRef.current === keyboard) typingAudioRef.current = null
    }
    // currentLine.text만 바뀌어도 다시 돌아야 하므로 lineIndex를 키로 쓴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene?.id, lineIndex])

  useEffect(() => {
    if (!currentLine?.sound) return undefined
    const lineSound = new Audio(currentLine.sound)
    const requestedVolume = Number(currentLine.soundVolume ?? 1)
    lineSound.volume = Number.isFinite(requestedVolume)
      ? Math.min(1, Math.max(0, requestedVolume))
      : 1
    lineSound.loop = Boolean(currentLine.soundLoop)
    lineSound.play().catch(() => {})
    return () => {
      lineSound.pause()
      lineSound.currentTime = 0
    }
    // 대사별 사운드는 같은 줄 안에서 옵션이 바뀌지 않으므로 줄 인덱스를 재생 키로 쓴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene?.id, lineIndex])

  if (!activeScene || !currentLine) return null

  const advance = () => {
    if (!typingFinished) {
      if (typingIntervalRef.current) window.clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
      typingAudioRef.current?.pause()
      typingAudioRef.current = null
      setTyped(renderedText)
      setTypingFinished(true)
      return
    }
    if (lineIndex + 1 < lines.length) {
      // 다음 줄의 effect가 실행되기 전 이전 문장이 한 프레임 남지 않도록 먼저 비운다.
      setTyped('')
      setTypingFinished(false)
      setLineIndex(lineIndex + 1)
    } else closeScene()
  }

  const { slots, activeIndex } = computePortraitState(lines, lineIndex)
  const speakerName = CHARACTERS[currentLine.speaker]?.name
  const typedSegments = parseDialogueBold(typed)

  return <div className="dialogue-backdrop"
    onClick={(event) => { if (event.button === 0) advance() }}
    onContextMenu={(event) => event.preventDefault()}
    onDragStart={(event) => event.preventDefault()}
    role="button" tabIndex={0}
    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') advance() }}>
    <div className="dialogue-portraits">
      <Portrait slot={slots[0]} side="left" active={activeIndex === 0} />
      <Portrait slot={slots[1]} side="right" active={activeIndex === 1} />
    </div>
    <div className="dialogue-box">
      {speakerName && <b className="dialogue-speaker">{speakerName}</b>}
      <p>{typedSegments.map((segment, index) => segment.bold
        ? <strong key={`${index}-${segment.text}`}>{segment.text}</strong>
        : <span key={`${index}-${segment.text}`}>{segment.text}</span>)}{typingFinished && <span className="dialogue-next" aria-hidden="true">▼</span>}</p>
    </div>
  </div>
}
