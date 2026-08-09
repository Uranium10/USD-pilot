import { useEffect, useRef, useState } from 'react'
import './App.css'
import BgmController from './components/BgmController.jsx'
import DialogueScene from './components/DialogueScene.jsx'
import MarketDesktop from './components/MarketDesktop.jsx'
import NightPanel from './components/NightPanel.jsx'
import NightTutorialOverlay from './components/NightTutorialOverlay.jsx'
import RoomScene from './components/RoomScene.jsx'
import TutorialOverlay from './components/TutorialOverlay.jsx'
import { IntroChoiceOverlay, NightTutorialChoiceOverlay } from './components/TutorialChoiceOverlay.jsx'
import { COIN_ASSET_ID, DAYS_PER_CYCLE, INTEREST_RATE, SISYPHUS_STOCK_ID } from './config.js'
import { stageEngine } from './engine/StageEngine.js'
import { getMinPayment } from './logic/debtSystem.js'
import { playCashOut, playTitleClick, playTitleHover } from './services/audioService.js'
import { fetchMarketCycle, prefetchMarketCycle, resetMarketCycleCache } from './services/marketService.js'
import { clearSavedSession, getDeviceId, getSavedSession, saveSession } from './services/sessionService.js'
import { useGameStore } from './store/gameStore.js'

const money = (value) => `₡${Math.round(value || 0).toLocaleString('ko-KR')}`
const subtitles = ['Upside Down', 'Useless Decision', 'Unpaid Space Debt', 'Urgent Sell Disaster', 'Universal Space Depression', 'Unbelievable Stock Drop', 'Ultimate Survival Day', 'Unfair System Design', 'Underground Stock Dealer', 'Unlimited Space Dream']

function Title() {
  const beginLoading = useGameStore((state) => state.beginLoading)
  const loadMarket = useGameStore((state) => state.loadMarket)
  const restoreSession = useGameStore((state) => state.restoreSession)
  const [loading, setLoading] = useState(false)
  const [savedSession, setSavedSession] = useState(null)
  const [checkingSave, setCheckingSave] = useState(true)
  const [subtitle] = useState(() => subtitles[Math.floor(Math.random() * subtitles.length)])
  const [glitching, setGlitching] = useState(false)
  const [leavingTitle, setLeavingTitle] = useState(false)
  useEffect(() => {
    let active = true
    getSavedSession().then((session) => {
      if (active && session?.status === 'active') setSavedSession(session)
    }).finally(() => { if (active) setCheckingSave(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let burstTimer
    let releaseTimer
    const schedule = () => {
      burstTimer = window.setTimeout(() => {
        setGlitching(true)
        releaseTimer = window.setTimeout(() => {
          setGlitching(false)
          schedule()
        }, 140 + Math.random() * 220)
      }, 1920 + Math.random() * 3680)
    }
    schedule()
    return () => {
      window.clearTimeout(burstTimer)
      window.clearTimeout(releaseTimer)
    }
  }, [])
  const startNew = async () => {
    playTitleClick()
    setLoading(true)
    setLeavingTitle(true)
    setSavedSession(null)
    await new Promise((resolve) => window.setTimeout(resolve, 1200))
    beginLoading()
    await clearSavedSession()
    resetMarketCycleCache()
    loadMarket(await fetchMarketCycle(1, undefined, undefined, undefined, getDeviceId()))
  }
  const continueGame = async () => {
    if (!savedSession) return
    playTitleClick()
    setLoading(true)
    setLeavingTitle(true)
    await new Promise((resolve) => window.setTimeout(resolve, 1200))
    const world = savedSession.worldState || {}
    const companiesWerePinned = world.companyIdsPinned
      || (!Object.hasOwn(world, 'companyIdsPinned') && savedSession.cycle > 1)
    const market = world.market || await fetchMarketCycle(
      savedSession.cycle,
      companiesWerePinned ? world.companyIds : undefined,
      world.coinStartPrice,
      savedSession.marketSeed,
      getDeviceId(),
    )
    restoreSession(savedSession, market)
  }
  const summary = savedSession
    ? `${savedSession.cycle}주차 ${savedSession.day}일 · 현금 ${money(savedSession.cash)}`
    : checkingSave ? '저장 데이터 확인 중…' : '진행 중인 저장 없음'
  return <main className={`title-screen ${glitching ? 'is-glitching' : ''} ${leavingTitle ? 'is-leaving' : ''}`}><p className="eyebrow">DEBT SURVIVAL TERMINAL</p><h1 data-text="U.S.D">U.S.D</h1><p className="subtitle">{subtitle}</p><div className="title-actions"><button className="primary large" onMouseEnter={() => { if (!loading) playTitleHover() }} onFocus={(event) => { if (!loading && event.currentTarget.matches(':focus-visible')) playTitleHover() }} onClick={startNew} disabled={loading}>{loading ? '시장 연결 중…' : '새로하기'}</button><div className="continue-slot"><button className="secondary large continue-button" onMouseEnter={() => { if (!loading && !checkingSave && savedSession) playTitleHover() }} onFocus={(event) => { if (!loading && !checkingSave && savedSession && event.currentTarget.matches(':focus-visible')) playTitleHover() }} onClick={continueGame} disabled={loading || checkingSave || !savedSession}>이어하기</button>{savedSession && <aside className="save-preview" aria-hidden="true"><span>SESSION RECOVERY POINT</span><strong>{savedSession.cycle}주차 · {savedSession.day}일차</strong><dl><div><dt>현금</dt><dd>{money(savedSession.cash)}</dd></div><div><dt>총부채</dt><dd>{money(savedSession.debt)}</dd></div></dl><small>클릭하여 이 지점에서 계속</small></aside>}</div></div>{!savedSession && <p className="save-summary">{summary}</p>}</main>
}

function DayTransition() {
  const cycle = useGameStore((state) => state.cycle)
  const day = useGameStore((state) => state.day)
  const epilogue = useGameStore((state) => state.epilogue)
  const completeDayIntro = useGameStore((state) => state.completeDayIntro)
  const marketReady = useGameStore((state) => state.marketReady)
  const [typed, setTyped] = useState('')
  const [typingFinished, setTypingFinished] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const text = epilogue ? `청산 완료. 자유의 7주차, ${day}일.` : `${cycle}주차, ${day}일.`
    const keyboard = new Audio('/sounds/KeyboardPress.mp3')
    keyboard.volume = 0.22
    let index = 0
    let interval
    setTyped('')
    setTypingFinished(false)
    setLeaving(false)
    const startTimer = window.setTimeout(() => {
      interval = window.setInterval(() => {
        index += 1
        setTyped(text.slice(0, index))
        keyboard.currentTime = 0
        keyboard.play().catch(() => {})
        if (index >= text.length) {
          window.clearInterval(interval)
          interval = undefined
          setTypingFinished(true)
        }
      }, 115)
    }, 850)
    return () => {
      window.clearTimeout(startTimer)
      if (interval) window.clearInterval(interval)
      keyboard.pause()
    }
  }, [cycle, day, epilogue])

  useEffect(() => {
    if (!typingFinished || !marketReady) return
    const leaveTimer = window.setTimeout(() => setLeaving(true), 700)
    const finishTimer = window.setTimeout(completeDayIntro, 1400)
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(finishTimer)
    }
  }, [completeDayIntro, marketReady, typingFinished])

  return <div className={`day-transition ${leaving && marketReady ? 'leaving' : ''}`}><p>{typed}<span className={typingFinished ? 'typing-finished' : ''} aria-hidden="true">▋</span></p>{!marketReady && <div className="market-loading" role="status"><span aria-hidden="true" />시장 정보를 생성하는 중…</div>}</div>
}

function AutoSave() {
  const [saving, setSaving] = useState(false)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    const stablePhases = new Set(['premarket', 'day', 'dayReport', 'night', 'settlement', 'epilogueIntro', 'gameover', 'ended'])
    const initialState = useGameStore.getState()
    let lastPhase = initialState.phase
    let lastScreen = initialState.screen
    let lastMonitorHint = initialState.showMonitorHint
    let lastCriticalSignature = ''
    let lastSavedAt = 0
    let timer
    let savingPromise
    let needsResave = false
    const criticalSignature = (state) => JSON.stringify({
      phase: state.phase,
      cycle: state.cycle,
      day: state.day,
      screen: state.screen,
      showMonitorHint: state.showMonitorHint,
      miningTier: state.miningTier,
      hackingDeckLevel: state.hackingDeckLevel,
      inventory: state.inventory,
      energy: state.energy,
      cash: state.cash,
      debt: state.debt,
      nightActivity: state.nightActivity?.id || null,
      purchasedRumors: state.purchasedRumors.map((rumor) => [rumor.id, rumor.status]),
      playedSceneIds: state.playedSceneIds,
      nightTutorialSeen: state.nightTutorialSeen,
    })
    const persist = () => {
      timer = undefined
      if (savingPromise) {
        needsResave = true
        return savingPromise
      }
      savingPromise = (async () => {
        if (mountedRef.current) setSaving(true)
        do {
          needsResave = false
          const state = useGameStore.getState()
          if (!state.market || !stablePhases.has(state.phase)) break
          lastSavedAt = Date.now()
          await saveSession(state)
        } while (needsResave)
      })().finally(() => {
        savingPromise = undefined
        if (mountedRef.current) setSaving(false)
      })
      return savingPromise
    }
    const unsubscribe = useGameStore.subscribe((state) => {
      if (!state.market || !stablePhases.has(state.phase)) {
        lastPhase = state.phase
        lastScreen = state.screen
        lastMonitorHint = state.showMonitorHint
        lastCriticalSignature = criticalSignature(state)
        return
      }
      const nextCriticalSignature = criticalSignature(state)
      const criticalStateChanged = nextCriticalSignature !== lastCriticalSignature
      const navigationChanged = state.phase !== lastPhase
        || state.screen !== lastScreen
        || state.showMonitorHint !== lastMonitorHint
      lastPhase = state.phase
      lastScreen = state.screen
      lastMonitorHint = state.showMonitorHint
      lastCriticalSignature = nextCriticalSignature
      if (criticalStateChanged || navigationChanged || Date.now() - lastSavedAt >= 15000) {
        if (timer) window.clearTimeout(timer)
        persist()
      } else if (!timer) {
        timer = window.setTimeout(persist, 15000 - (Date.now() - lastSavedAt))
      }
    })
    const saveBeforeLeaving = () => saveSession(useGameStore.getState())
    window.addEventListener('pagehide', saveBeforeLeaving)
    return () => {
      mountedRef.current = false
      unsubscribe()
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('pagehide', saveBeforeLeaving)
    }
  }, [])
  return saving ? <div className="save-indicator" role="status"><span aria-hidden="true" />저장중입니다</div> : null
}

function Premarket() {
  const state = useGameStore()
  const [selectedRumorIds, setSelectedRumorIds] = useState([])
  const [flashingRumorIds, setFlashingRumorIds] = useState([])
  if (!state.market) return null
  const data = state.market.days[state.day - 1]
  const selectedRumors = data.rumors.filter((rumor) => selectedRumorIds.includes(rumor.id))
  const selectedCost = selectedRumors.reduce((total, rumor) => total + rumor.cost, 0)
  const toggleRumor = (rumorId) => setSelectedRumorIds((ids) => ids.includes(rumorId) ? ids.filter((id) => id !== rumorId) : [...ids, rumorId])
  const purchaseSelected = () => {
    const purchased = state.purchaseRumors(selectedRumors)
    if (!purchased) return
    playCashOut()
    setFlashingRumorIds(purchased.map((rumor) => rumor.id))
    setSelectedRumorIds([])
    window.setTimeout(() => setFlashingRumorIds([]), 450)
  }
  return <section className="panel premarket"><p className="eyebrow">WEEK {state.cycle} · DAY {state.day} · 정보 거래소</p><h2>정보를 구입하세요.</h2><div className="rumor-grid">{data.rumors.map((rumor) => { const purchased = state.purchasedRumors.some((item) => item.id === rumor.id); const queued = selectedRumorIds.includes(rumor.id); const sisyphusIntel = rumor.stockId === SISYPHUS_STOCK_ID; return <button key={rumor.id} className={`rumor ${sisyphusIntel ? 'sisyphus-intel' : ''} ${purchased ? 'selected' : ''} ${queued ? 'queued' : ''} ${flashingRumorIds.includes(rumor.id) ? 'purchase-flash' : ''}`} onClick={() => toggleRumor(rumor.id)} disabled={purchased}><span>{purchased ? '구입됨' : queued ? '구매 선택됨' : sisyphusIntel ? '시지프 인텔 채널' : '암호화된 정보'}</span><strong>출처: {rumor.source}</strong><small>{purchased ? `신뢰도 ${Math.round(rumor.accuracy * 100)}% 확인됨` : '내용 및 신뢰도 미상'} · {money(rumor.cost)}</small></button> })}</div><p className="purchase-summary">구입 {state.purchasedRumors.length}건 · 선택 {selectedRumors.length}건 ({money(selectedCost)}) · 남은 현금 {money(state.cash)}</p><div className="premarket-actions"><button className="secondary" onClick={purchaseSelected} disabled={selectedRumors.length === 0 || selectedCost > state.cash}>선택 정보 구입</button><button className="primary" onClick={() => state.showOverlay({ type: 'dayBriefing', title: `${state.day}일차 정보 브리핑` })}>구입 완료</button></div></section>
}

function Settlement() {
  const state = useGameStore()
  const [extra, setExtra] = useState(0)
  const minPayment = getMinPayment(state.debt, state.cycle)
  const maxPayable = Math.max(0, Math.min(state.cash, state.debt))
  const canPayMin = state.cash >= minPayment
  const maxExtra = Math.max(0, maxPayable - minPayment)
  const clampedExtra = Math.min(extra, maxExtra)
  const payAmount = minPayment + clampedExtra
  // 지금 payAmount만큼 갚으면 다음 주기로 넘어갈 남은 부채에 이자가 얼마나 붙는지 미리 보여준다.
  // (최소 상환만 했을 때의 이자와 비교해서 "선상환으로 아끼는 이자"를 계산한다.)
  const interestIfMinOnly = Math.round(Math.max(0, state.debt - minPayment) * INTEREST_RATE)
  const interestIfPay = Math.round(Math.max(0, state.debt - payAmount) * INTEREST_RATE)
  const interestSaved = interestIfMinOnly - interestIfPay

  // 정산 화면에 들어온 시점에 "다음 사이클이 필요할 가능성이 높다"는 걸 이미 알기 때문에,
  // 플레이어가 상환액을 고르는 동안 백그라운드에서 미리 다음 사이클을 받아둔다. 빚을 다
  // 갚거나(clear) 게임오버가 나면 그냥 버려진다(약간의 낭비지만 대부분의 정산은 다음
  // 사이클로 이어지므로 감수할 만하다). 배경: USD-spec/agent_workthrough_2.md.
  useEffect(() => {
    prefetchMarketCycle(state.cycle + 1, state.market?.companyIds, state.currentPrices[COIN_ASSET_ID], undefined, getDeviceId())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const settle = async (amount) => {
    const cashBefore = state.cash
    const result = state.settleCycle(amount)
    if (result && useGameStore.getState().cash < cashBefore) playCashOut()
    if (result?.result === 'next') {
      state.loadNextCycle(await fetchMarketCycle(result.cycle, state.market?.companyIds, state.currentPrices[COIN_ASSET_ID], undefined, getDeviceId()))
    } else if (result?.result === 'epilogue') {
      state.loadEpilogueCycle(await fetchMarketCycle(result.cycle, state.market?.companyIds, state.currentPrices[COIN_ASSET_ID], undefined, getDeviceId()))
    }
  }

  return <section className="modal-card settlement-card">
    <p className="eyebrow">WEEKLY COLLECTION</p>
    <h2>{DAYS_PER_CYCLE}일이 지났습니다.</h2>
    <dl className="settlement-figures">
      <div><dt>보유 현금</dt><dd>{money(state.cash)}</dd></div>
      <div><dt>이번 주 최소 상환액</dt><dd>{money(minPayment)}</dd></div>
      <div><dt>총 부채</dt><dd>{money(state.debt)}</dd></div>
    </dl>
    {canPayMin ? <>
      <label className="extra-payment">
        <span>추가 상환(선상환) <strong>{money(clampedExtra)}</strong></span>
        <input type="range" min="0" max={maxExtra} step="100" value={clampedExtra} onChange={(event) => setExtra(Number(event.target.value))} disabled={maxExtra <= 0} />
      </label>
      <p className="settlement-preview">이번에 {money(payAmount)} 상환 시 다음 주기 이자 {interestSaved > 0 ? `−${money(interestSaved)}` : money(0)}</p>
      <div className="settlement-actions">
        <button className="secondary" onClick={() => settle(minPayment)}>최소 상환</button>
        <button className="danger" onClick={() => settle(payAmount)}>{clampedExtra > 0 ? `${money(payAmount)} 상환한다` : '상환한다'}</button>
      </div>
    </> : <button className="danger" onClick={() => settle(state.cash)}>빈 지갑을 내민다</button>}
  </section>
}

function Room() {
  const state = useGameStore()
  const minPayment = getMinPayment(state.debt, state.cycle)
  return <RoomScene>
    <header className="room-title"><b>U.S.D</b><span>UNPAID SPACE DEBT</span></header>
    <aside className="room-status"><b>{state.cycle}주차 · {state.day}일차</b><span>현금 {money(state.cash)}</span><span>총부채 {money(state.debt)}</span><span>최소상환 {money(minPayment)}</span></aside>
    <NightPanel />
    {state.nightTutorialPrompt && <NightTutorialChoiceOverlay />}
    {state.showNightTutorial && <NightTutorialOverlay />}
    {state.phase === 'settlement' && <Settlement />}
  </RoomScene>
}

function Overlay() {
  const state = useGameStore()
  if (!state.overlay) return null
  const information = state.overlay.type === 'dayBriefing' || state.overlay.type === 'purchasedInfo'
  return <div className="overlay-backdrop"><div className="overlay-modal">{state.overlay.title && <h2>{state.overlay.title}</h2>}{state.overlay.text && <p>{state.overlay.text}</p>}{information && <div className="information-list">{state.purchasedRumors.length === 0 && <p className="muted">구입한 정보가 없습니다.</p>}{state.purchasedRumors.map((rumor) => <article key={rumor.id}><small>{rumor.source} · 신뢰도 {Math.round(rumor.accuracy * 100)}%</small><p>{rumor.text}</p></article>)}</div>}{state.overlay.type === 'dayBriefing' ? <button className="primary" onClick={state.startDay}>{state.day}일차 시작</button> : <button className="primary" onClick={state.closeOverlay}>닫기</button>}</div></div>
}

// 4분기 엔딩(USD-spec/STORY.md §4): 배드(phase='gameover')는 기존 부채 청산 실패
// 로직 그대로, 나머지 3개(노멀/히든/진)는 phase='ended' + endingType으로 분기한다.
const ENDINGS = {
  bad: { eyebrow: 'ACCOUNT LIQUIDATED', title: '끝났다.', className: '' },
  normal: {
    eyebrow: 'DEBT CLEARED',
    title: '살아남았다.',
    body: '빚이라는 바위를 다 밀어 올렸다. 하지만 단타의 도파민은 여전히 몸에 남아, 오늘도 차트 앞에 앉는다 — 현대판 시지프스.',
    className: 'clear',
  },
  hidden: {
    eyebrow: 'HOSTILE TAKEOVER',
    title: '왕좌를 빼앗았다.',
    body: '시지프 인텔리전스의 51%를 손에 넣었다. 사장을 끌어내리고 메티스를 셧다운했지만, 부모님의 행방은 끝내 찾지 못했다.',
    className: 'clear hidden',
  },
  true: {
    eyebrow: 'ESCAPE VELOCITY',
    title: '궤도를 벗어났다.',
    body: '밀항선 티켓을 쥐고 우주로 도주한다. 그곳에서, 부모님이 지옥을 뚫고 무사히 도주했다는 암호 메시지가 도착한다.',
    className: 'clear true',
  },
}

function Ending() {
  const state = useGameStore()
  const key = state.phase === 'gameover' ? 'bad' : (state.endingType || 'normal')
  const ending = ENDINGS[key] || ENDINGS.normal
  const body = key === 'bad' ? `${state.cycle}주차, 채권 추심 드론이 문을 두드립니다.` : ending.body
  return <main className={`ending ${ending.className}`}><p className="eyebrow">{ending.eyebrow}</p><h1>{ending.title}</h1><p>{body}</p><button className="primary" onClick={state.restart}>다시 시작</button></main>
}

export default function App() {
  const screen = useGameStore((state) => state.screen)
  const phase = useGameStore((state) => state.phase)
  const activeScene = useGameStore((state) => state.activeScene)
  useEffect(() => { stageEngine.start(); return () => stageEngine.stop() }, [])
  const ending = phase === 'gameover' || phase === 'ended'
  const isDayIntro = phase === 'dayIntro' || phase === 'epilogueIntro'
  return <div className="game-frame"><BgmController /><AutoSave /><div style={{ display: ending ? 'block' : 'none' }}><Ending /></div>{screen === 'title' && !ending && <Title />}<div style={{ display: screen === 'room' && !isDayIntro && phase !== 'tutorial' && !ending ? 'block' : 'none' }}><Room /></div><div style={{ display: screen === 'monitor' && phase === 'premarket' && !ending ? 'block' : 'none' }}><main className="monitor-shell"><Premarket /></main></div><div style={{ display: screen === 'monitor' && phase !== 'premarket' && !isDayIntro && !ending ? 'block' : 'none' }}><MarketDesktop /></div>{isDayIntro && <DayTransition />}{phase === 'introChoice' && <IntroChoiceOverlay />}{phase === 'tutorial' && <TutorialOverlay />}<Overlay />{activeScene && <DialogueScene />}</div>
}
