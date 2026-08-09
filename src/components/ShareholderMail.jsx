import { useGameStore } from '../store/gameStore.js'

// 시지프 인텔리전스 주식을 51%(510주) 이상 매집했을 때만 Taskbar에 뜨는 메일함.
// "확인"을 누르는 순간(플레이어가 원하는 시점) 히든 엔딩(적대적 M&A)이 발동한다 —
// 510주를 채운 즉시 스토리를 끊지 않고, 이 메일을 열어볼지는 플레이어가 정한다.
export default function ShareholderMail() {
  const triggerHiddenEnding = useGameStore((state) => state.triggerHiddenEnding)
  return <section className="desktop-window mail-window" aria-label="긴급 주주총회 메일">
    <div className="window-titlebar">
      <b>✉ [긴급] 임시 주주총회 소집 통지</b>
      <span>— □ ×</span>
    </div>
    <div className="mail-body">
      <p className="mail-meta">발신: 시지프 인텔리전스 이사회　수신: 귀하</p>
      <p>귀하의 지분율이 의결권 과반(51%)을 넘어섰음을 확인했습니다.</p>
      <p>정관에 따라, 귀하는 임시 이사회를 소집해 현 경영진의 해임 및 신규 경영권 행사를
        요구할 권리를 가집니다. 이사회실의 문은 이미 열려 있습니다.</p>
      <p className="mail-warn">※ 이 절차를 개시하면 되돌릴 수 없습니다.</p>
      <button className="primary" onClick={triggerHiddenEnding}>이사회 소집을 확정한다</button>
    </div>
  </section>
}
