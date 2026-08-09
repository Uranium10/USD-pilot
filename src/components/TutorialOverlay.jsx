import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'

const STEPS = [
  {
    tag: '01 / 생존 조건',
    title: '6주 안에 빚을 정리하세요.',
    body: '한 주는 7일입니다. 매일 8분 동안 시장이 열리고, 밤은 직접 하루 종료를 누를 때까지 계속됩니다.',
    points: ['주간 최소 상환액을 못 내면 즉시 게임 오버', '남은 부채에는 매주 이자가 붙음', '6주 안에 전액 상환하면 특별한 7주차 진입'],
  },
  {
    tag: '02 / 하루의 흐름',
    title: '정보를 고르고, 거래하고, 밤을 준비하세요.',
    body: '매일 정보 거래소에서 시작합니다. 정보를 산 뒤 장을 열고, 마감 보고서를 확인한 다음 방으로 돌아옵니다.',
    points: ['정보 선택 → 8분 거래 → 일일 보고서 → 밤 활동', '낮에는 주식 매수·매도와 DUST 판매 가능', '밤에는 상점·아르바이트·장비 업그레이드 가능'],
  },
  {
    tag: '03 / 유료 정보',
    title: '정보는 확률이지 정답지가 아닙니다.',
    body: '비싼 정보일수록 대체로 신뢰도가 높지만 틀릴 수 있습니다. 구입한 정보는 메모장에서 계속 확인할 수 있습니다.',
    points: ['적중한 정보는 이벤트 발생 시 (완료됨) 표시', '완료된 정보는 그날 밤 제거', '빗나간 정보는 다음 날 밤까지 남음'],
  },
  {
    tag: '04 / 주식과 DUST',
    title: '현금이 필요해지는 순간을 계산하세요.',
    body: '주식은 자유롭게 사고팔 수 있지만 DUST는 직접 살 수 없습니다. 채굴기나 사이버 러너로 얻은 DUST만 판매할 수 있습니다.',
    points: ['DUST는 초반부터 모아 장기 보유할수록 유리', '시지프 인텔리전스 510주 보유 시 특별한 선택 해금', '수익보다 주간 상환용 현금 확보가 먼저일 수 있음'],
  },
  {
    tag: '05 / 밤 활동',
    title: '밤에는 시간이 흐르지 않습니다.',
    body: '활동력과 현금을 확인하고 필요한 준비를 마친 뒤 하루 종료를 누르세요. 서두를 필요는 없습니다.',
    points: ['아르바이트는 확정 크레딧 수입', '채굴기는 장이 열린 동안 DUST 생산', '해킹 덱은 사이버 러너와 특별 보상을 해금'],
  },
]

export default function TutorialOverlay() {
  const completeTutorial = useGameStore((state) => state.completeTutorial)
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]

  useEffect(() => setStepIndex(0), [])

  const next = () => {
    if (stepIndex < STEPS.length - 1) setStepIndex((index) => index + 1)
    else completeTutorial()
  }

  return <section className="tutorial-backdrop" aria-label="게임 튜토리얼">
    <article className="tutorial-card">
      <header><span>{step.tag}</span><strong>{stepIndex + 1} / {STEPS.length}</strong></header>
      <div className="tutorial-progress" aria-hidden="true">{STEPS.map((_, index) => <i key={index} className={index <= stepIndex ? 'active' : ''} />)}</div>
      <h2>{step.title}</h2>
      <p>{step.body}</p>
      <ul>{step.points.map((point) => <li key={point}>{point}</li>)}</ul>
      <footer>
        <button type="button" className="secondary" onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0}>이전</button>
        <button type="button" className="primary" onClick={next}>{stepIndex === STEPS.length - 1 ? '시장에 접속한다' : '다음'}</button>
      </footer>
    </article>
  </section>
}
