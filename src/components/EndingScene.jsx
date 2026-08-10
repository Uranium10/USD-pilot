import { useEffect, useState } from 'react'
import { ENDING_TEMPLATES } from '../data/endingTemplates.js'
import { CHARACTERS } from '../data/storyScript.js'
import { parseDialogueBold, renderDialogueTemplate } from '../logic/dialogueTemplate.js'
import { useGameStore } from '../store/gameStore.js'

export default function EndingScene() {
  const state = useGameStore()
  const key = state.phase === 'gameover' ? 'bad' : (state.endingType || 'normal')
  const ending = ENDING_TEMPLATES[key] || ENDING_TEMPLATES.normal
  const [lineIndex, setLineIndex] = useState(0)
  const lines = ending.lines
  const finished = lineIndex >= lines.length
  const line = lines[Math.min(lineIndex, Math.max(0, lines.length - 1))]
  const background = (() => {
    for (let index = Math.min(lineIndex, lines.length - 1); index >= 0; index -= 1) {
      if (lines[index]?.background) return lines[index].background
    }
    return null
  })()

  useEffect(() => setLineIndex(0), [key])

  const rendered = renderDialogueTemplate(finished ? ending.summary : (line?.text || ''), state)
  const segments = parseDialogueBold(rendered)
  const speaker = finished ? null : CHARACTERS[line?.speaker]?.name

  return <main className={`ending ending-scene ${ending.className}`} style={background ? { '--ending-background': `url("${background}")` } : undefined}>
    <div className="ending-scene-shade" />
    {!finished ? <button className="ending-dialogue" type="button" onClick={() => setLineIndex((index) => index + 1)}>
      {speaker && <b>{speaker}</b>}
      <span>{segments.map((segment, index) => segment.bold ? <strong key={index}>{segment.text}</strong> : segment.text)}</span>
      <small>{lineIndex + 1} / {lines.length}　▼</small>
    </button> : <section className="ending-result">
      <p className="eyebrow">{ending.eyebrow}</p><h1>{ending.title}</h1><p>{rendered}</p>
      <button className="primary" onClick={state.restart}>다시 시작</button>
    </section>}
  </main>
}
