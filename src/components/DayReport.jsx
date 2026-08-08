import { useGameStore } from '../store/gameStore.js'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`

export default function DayReport() {
  const state = useGameStore()
  if (state.phase !== 'dayReport') return null
  const summary = state.dailySummaries.at(-1)
  const holdingsValue = summary ? summary.netWorth - summary.cash : 0

  return <div className="report-backdrop">
    <section className="day-report window-card">
      <div className="window-titlebar"><b>거래 종합 보고서</b><span>{state.cycle}주차 {state.day}일차</span></div>
      <div className="report-body">
        <p className="eyebrow">MARKET CLOSED</p>
        <h2>금일 거래가 종료되었습니다.</h2>
        <dl>
          <div><dt>마감 총자산</dt><dd>{money(summary?.netWorth)}</dd></div>
          <div><dt>현금</dt><dd>{money(summary?.cash)}</dd></div>
          <div><dt>보유 주식·코인 평가액</dt><dd>{money(holdingsValue)}</dd></div>
          <div><dt>오늘 자산 변동</dt><dd className={summary?.change >= 0 ? 'green' : 'red'}>{summary?.change >= 0 ? '+' : ''}{money(summary?.change)}</dd></div>
        </dl>
        <button className="primary" onClick={state.enterNight}>확인 · 밤으로</button>
      </div>
    </section>
  </div>
}
