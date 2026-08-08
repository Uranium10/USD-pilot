function buildDocument(rumors) {
  if (rumors.length === 0) return '구입한 정보가 없습니다.'
  return rumors.map((rumor, index) => [
    `[정보 ${index + 1}]`,
    `출처: ${rumor.source}`,
    `신뢰도: ${Math.round(rumor.accuracy * 100)}%`,
    '',
    rumor.text,
  ].join('\n')).join('\n\n────────────────────────\n\n')
}

export default function InformationNotepad({ rumors }) {
  const document = buildDocument(rumors)
  return <section className="desktop-window notepad-window" aria-label="구입한 정보 메모장">
    <div className="notepad-tabbar">
      <span className="notepad-app-icon">▤</span>
      <div className="notepad-tab"><b>구입 정보.txt</b><span>×</span></div>
      <button className="new-tab" aria-label="새 탭">＋</button>
      <div className="window-buttons"><button aria-label="최소화">―</button><button aria-label="최대화">□</button><button className="window-close" aria-label="닫기">×</button></div>
    </div>
    <div className="notepad-commandbar">
      <nav><button>파일</button><button>편집</button><button>보기</button></nav>
      <div className="notepad-tools" aria-hidden="true">
        <button>H1⌄</button><button>☷⌄</button><span className="tool-separator" /><button><b>B</b></button><button><i>I</i></button><button><s>S</s></button><button>↗</button><button>⊞⌄</button><button>A⌁</button>
        <span className="tool-spacer" /><button>◈⌄</button><button>⌁</button><button>♙</button><button>⚙</button>
      </div>
    </div>
    <div className="notepad-editor" role="textbox" aria-readonly="true">{document}</div>
    <footer className="notepad-statusbar"><span>줄 1, 열 1</span><span>{document.length}자</span><span className="status-spacer" /><span>일반 텍스트</span><span>100%</span><span>Windows (CRLF)</span><span>UTF-8</span></footer>
  </section>
}
