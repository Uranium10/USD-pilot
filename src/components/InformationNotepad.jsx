import { useLayoutEffect, useRef, useState } from 'react'
import { getWeeklyModifier } from '../logic/weeklyModifiers.js'
import { useGameStore } from '../store/gameStore.js'

const informationText = (rumors, modifier) => `${modifier ? `[이번 주 제약] ${modifier.name} — ${modifier.detail} ` : ''}${rumors.length === 0 ? '구입한 정보가 없습니다.' : rumors.map((rumor, index) => [
  `[정보 ${index + 1}${rumor.status === 'completed' ? ' · 완료됨' : ''}]`, `출처: ${rumor.source}`, `신뢰도: ${Math.round(rumor.accuracy * 100)}%`, rumor.text,
].join(' ')).join(' ')}`
const plainText = (html) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')

export default function InformationNotepad({ rumors }) {
  const editorRef = useRef(null)
  const initialContent = useRef(useGameStore.getState().notepadContent)
  const [characterCount, setCharacterCount] = useState(() => plainText(initialContent.current).length)
  const fontSize = useGameStore((state) => state.notepadFontSize)
  const modifier = useGameStore((state) => getWeeklyModifier(state.weeklyModifierId))
  const setFontSize = useGameStore((state) => state.setNotepadFontSize)

  useLayoutEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialContent.current
  }, [])

  const saveContent = () => {
    const html = editorRef.current?.innerHTML || ''
    useGameStore.getState().setNotepadContent(html)
    setCharacterCount(plainText(html).length)
  }

  const format = (command) => {
    editorRef.current?.focus()
    document.execCommand(command, false)
    saveContent()
  }

  const resizeSelectedLines = (change) => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount || !editor.contains(selection.anchorNode)) return
    editor.focus()
    document.execCommand('formatBlock', false, 'div')
    const range = selection.getRangeAt(0)
    const blocks = [...editor.children].filter((block) => range.intersectsNode(block))
    const nextSize = Math.min(28, Math.max(12, fontSize + change))
    blocks.forEach((block) => { block.style.fontSize = `${nextSize}px` })
    setFontSize(nextSize)
    saveContent()
  }

  return <section className="desktop-window notepad-window" aria-label="정보 모음 메모장">
    <div className="notepad-tabbar">
      <span className="notepad-app-icon">▤</span>
      <div className="notepad-tab"><b>정보 모음.txt</b><span>×</span></div>
      <button className="new-tab" aria-label="새 탭">＋</button>
      <div className="window-buttons"><button aria-label="최소화">—</button><button aria-label="최대화">□</button><button className="window-close" aria-label="닫기">×</button></div>
    </div>
    <div className="notepad-commandbar">
      <div className="notepad-tools">
        <button type="button" onMouseDown={(event) => { event.preventDefault(); format('bold') }} aria-label="굵게"><b>B</b></button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); format('italic') }} aria-label="기울임"><i>I</i></button>
        <span className="tool-separator" />
        <button type="button" onMouseDown={(event) => { event.preventDefault(); resizeSelectedLines(-1) }} aria-label="선택한 줄 글자 작게">A−</button>
        <span className="font-size-value">{fontSize}px</span>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); resizeSelectedLines(1) }} aria-label="선택한 줄 글자 크게">A＋</button>
      </div>
    </div>
    <div className="notepad-document">
      {modifier && <div className="notepad-weekly-modifier" aria-label="현재 주간 제약">[이번 주 제약] {modifier.name} — {modifier.detail}</div>}
      {rumors.length > 0 && <section className="locked-information" aria-label="구입한 정보 읽기 전용" style={{ fontFamily: "Gulim, '굴림', sans-serif", fontSize: '16px' }}>
        {rumors.map((rumor, index) => (
          <div key={rumor.id} style={{ marginBottom: '16px' }}>
            <div>------------------------------</div>
            <br />
            <div>[정보 {index + 1}] 출처: {rumor.source} / 신뢰도: {Math.round(rumor.accuracy * 100)}% {rumor.status === 'completed' && <b className="information-completed">(완료됨)</b>}</div>
            <div>"{rumor.text}"</div>
            <br />
            <div>------------------------------</div>
          </div>
        ))}
      </section>}
      <div ref={editorRef} className="notepad-editor editable-notes" contentEditable suppressContentEditableWarning data-placeholder="여기에 메모를 입력하세요..." onInput={saveContent} />
    </div>
    <footer className="notepad-statusbar"><span>줄 1, 열 1</span><span>{informationText(rumors, modifier).length + characterCount}자</span><span className="status-spacer" /><span>일반 텍스트</span><span>100%</span><span>Windows (CRLF)</span><span>UTF-8</span></footer>
  </section>
}
