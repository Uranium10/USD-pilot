// 게임 화면을 고정 해상도(1024×768)로 그리고, 화면 크기에 맞춰 통째로 확대·축소한다.
//
// 이 게임의 UI는 데스크톱 메타포(창·작업표시줄·차트·메모장)에 맞춰 CSS 픽셀로
// 하드코딩돼 있다(App.css의 px 값 약 830개). 뷰포트가 좁아질 때 각 요소를 다시 배치하는
// 방식(리플로우)으로 대응하려면 그 값들을 전부 상대 단위로 바꾸고 화면 폭마다 레이아웃을
// 새로 짜야 한다. 대신 여기서는 배치를 전혀 건드리지 않고 4:3 프레임 전체를 균일 배율로
// 축소한다 — 리플로우가 일어나지 않으므로 좁은 화면에서 요소가 서로를 밀어내며 깨지는
// 일이 구조적으로 생길 수 없다. 작은 화면에서는 그만큼 작게 보이는 것이 대가다.
//
// 1024×768은 이미 이 프로젝트가 쓰던 디자인 해상도다(RoomScene의 방 배경 SVG 좌표계).
//
// 배율 상한은 두지 않는다. 이전 구현도 `min(100vw, 100vh*4/3)`으로 큰 화면에서 프레임을
// 키웠기 때문에, 상한을 두면 데스크톱에서 화면이 오히려 작아지는 회귀가 된다.

export const DESIGN_WIDTH = 1024
export const DESIGN_HEIGHT = 768

export function computeGameScale(width, height) {
  if (!(width > 0) || !(height > 0)) return 1
  return Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)
}

function apply() {
  // #root와 동일한 CSS 레이아웃 뷰포트로 계산한다. visualViewport의 offset/크기를
  // fixed 루트에 다시 적용하면 일부 삼성 인터넷 회전 상태에서 보정이 이중 적용되어
  // 1024×768 프레임이 화면 우하단으로 밀려난다.
  const width = document.documentElement.clientWidth || window.innerWidth
  const height = document.documentElement.clientHeight || window.innerHeight
  const scale = computeGameScale(width, height)
  document.documentElement.style.setProperty('--game-scale', String(scale))
}

let applyFrame = null

function scheduleApply() {
  if (applyFrame !== null) return
  applyFrame = window.requestAnimationFrame(() => {
    applyFrame = null
    apply()
  })
}

function refreshFirefoxFontLayer() {
  if (!navigator.userAgent.includes('Firefox') || !document.fonts?.ready) return
  document.fonts.ready.then(() => {
    let attempts = 0
    const refresh = () => {
      const frame = document.querySelector('.game-frame')
      if (!frame && attempts++ < 20) {
        window.requestAnimationFrame(refresh)
        return
      }
      if (!frame) return
      frame.classList.add('firefox-font-refresh')
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => frame.classList.remove('firefox-font-refresh')))
    }
    window.requestAnimationFrame(refresh)
  })
}

let started = false

export function startViewportScale() {
  if (started || typeof window === 'undefined') return
  started = true
  apply()
  window.addEventListener('resize', scheduleApply, { passive: true })
  window.addEventListener('orientationchange', scheduleApply, { passive: true })
  window.visualViewport?.addEventListener('resize', scheduleApply, { passive: true })
  refreshFirefoxFontLayer()
}
