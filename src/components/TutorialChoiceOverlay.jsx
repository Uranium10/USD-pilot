import { useGameStore } from '../store/gameStore.js'

export function IntroChoiceOverlay() {
  const prompt = useGameStore((state) => state.introPrompt)
  const choosePrologue = useGameStore((state) => state.choosePrologue)
  const chooseTutorial = useGameStore((state) => state.chooseTutorial)
  const skipIntro = useGameStore((state) => state.skipIntro)
  const prologue = prompt === 'prologue'

  return <section className="tutorial-choice-backdrop" aria-label={prologue ? '프롤로그 선택' : '튜토리얼 선택'}>
    <article className="tutorial-choice-card">
      <p className="eyebrow">NEW GAME SETUP · {prologue ? '01' : '02'}/02</p>
      <h2>{prologue ? '프롤로그를 보시겠습니까?' : '게임 튜토리얼을 보시겠습니까?'}</h2>
      <p>{prologue
        ? '타래가 이 방과 빚을 떠안게 된 첫날의 이야기를 재생합니다.'
        : '실제 화면을 짚어보며 정보 구매, 거래, 부채 상환 방법을 안내합니다.'}</p>
      <div className="tutorial-choice-actions">
        <button type="button" onClick={() => (prologue ? choosePrologue(false) : chooseTutorial(false))}>건너뛰기</button>
        <button type="button" className="primary" onClick={() => (prologue ? choosePrologue(true) : chooseTutorial(true))}>{prologue ? '프롤로그 보기' : '튜토리얼 보기'}</button>
      </div>
      <button type="button" className="tutorial-skip-all" onClick={skipIntro}>프롤로그와 튜토리얼 모두 건너뛰기</button>
    </article>
  </section>
}

export function NightTutorialChoiceOverlay() {
  const choose = useGameStore((state) => state.chooseNightTutorial)
  return <section className="tutorial-choice-backdrop night-choice" aria-label="야간 튜토리얼 선택">
    <article className="tutorial-choice-card">
      <p className="eyebrow">FIRST NIGHT</p>
      <h2>밤 활동 튜토리얼을 보시겠습니까?</h2>
      <p>활동력, 상점과 장비, 하루 종료 방법을 실제 밤 화면에서 짧게 안내합니다. 이 메시지는 이번 플레이에서 한 번만 표시됩니다.</p>
      <div className="tutorial-choice-actions">
        <button type="button" onClick={() => choose(false)}>건너뛰고 밤 시작</button>
        <button type="button" className="primary" onClick={() => choose(true)}>튜토리얼 보기</button>
      </div>
    </article>
  </section>
}
