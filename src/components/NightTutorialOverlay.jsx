import { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'

const STEPS = [
  {
    tag: '01 / 밤 활동',
    title: '활동력으로 확정 수입을 얻습니다.',
    body: '활동 탭의 아르바이트는 주가와 관계없이 크레딧을 벌어줍니다. 활동력은 다음 날 밤에 다시 회복됩니다.',
    target: 'activity',
  },
  {
    tag: '02 / 상점과 장비',
    title: '오늘 번 돈을 내일에 투자할 수 있습니다.',
    body: '상점에서 채굴기와 해킹 덱을 구입할 수 있습니다. 채굴기는 낮 거래 시간에만 DUST를 만들며, DUST는 매수할 수 없고 채굴·판매만 가능합니다.',
    target: 'tabs',
  },
  {
    tag: '03 / 하루 종료',
    title: '준비가 끝났다면 직접 잠드세요.',
    body: '밤에는 제한 시간이 없습니다. 필요한 활동과 구매를 모두 마친 뒤 오른쪽 아래의 「자기」 버튼을 눌러 다음 날로 넘어가세요.',
    target: 'sleep',
  },
]

export default function NightTutorialOverlay() {
  const close = useGameStore((state) => state.closeNightTutorial)
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const next = () => stepIndex < STEPS.length - 1 ? setStepIndex((index) => index + 1) : close()

  return <section className="night-tutorial" aria-label="첫날 밤 튜토리얼">
    <div className={`night-tutorial-spotlight target-${step.target}`} aria-hidden="true" />
    <button type="button" className="night-tutorial-skip" onClick={close}>튜토리얼 건너뛰기</button>
    <article className={`night-tutorial-coach coach-${step.target}`}>
      <header><span>{step.tag}</span><strong>{stepIndex + 1} / {STEPS.length}</strong></header>
      <h2>{step.title}</h2>
      <p>{step.body}</p>
      <footer>
        <button type="button" onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0}>이전</button>
        <div aria-hidden="true">{STEPS.map((_, index) => <i key={index} className={index <= stepIndex ? 'active' : ''} />)}</div>
        <button type="button" className="primary" onClick={next}>{stepIndex === STEPS.length - 1 ? '밤 시작' : '다음'}</button>
      </footer>
    </article>
  </section>
}
