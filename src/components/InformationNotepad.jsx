import { useLayoutEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'

function buildDocument(rumors) {
  const body = rumors.length === 0 ? '구입한 정보가 없습니다.' : rumors.map((rumor, index) => [
    `[정보 ${index + 1}]`,
    `출처: ${rumor.source}`,
    `신뢰도: ${Math.round(rumor.accuracy * 100)}%`,
    '',
    rumor.text,
  ].join('\n')).join('\n\n')
  return `──────────────────────────────\n\n${body}\n\n──────────────────────────────`
}

const plainText = (html) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')

export default function InformationNotepad({ rumors }) {
  const editorRef = useRef(null)
  const initialContent = useRef(useGameStore.getState().notepadContent)
  const [characterCount, setCharacterCount] = useState(() => plainText(initialContent.current).length)
  const fontSize = useGameStore((state) => state.notepadFontSize)
  const setFontSize = useGameStore((state) => state.setNotepadFontSize)
  const purchasedInformation = buildDocument(rumors)

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
        <button type="button" onClick={() => setFontSize(fontSize - 1)} aria-label="글자 작게">A−</button>
        <span className="font-size-value">{fontSize}px</span>
        <button type="button" onClick={() => setFontSize(fontSize + 1)} aria-label="글자 크게">A＋</button>
      </div>
    </div>
    <div className="notepad-document">
      <section className="locked-information" aria-label="구입한 정보 읽기 전용"><pre>{purchasedInformation}</pre></section>
      <div
        ref={editorRef}
        className="notepad-editor editable-notes"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="여기에 메모를 입력하세요..."
        style={{ fontSize: `${fontSize}px` }}
        onInput={saveContent}
      />
    </div>
    <footer className="notepad-statusbar"><span>줄 1, 열 1</span><span>{purchasedInformation.length + characterCount}자</span><span className="status-spacer" /><span>일반 텍스트</span><span>100%</span><span>Windows (CRLF)</span><span>UTF-8</span></footer>
  </section>
}
