let cashRegisterAudio
let cashOutAudio
let newsUpdateAudio
let marketCountdownAudio
let titleHoverAudio
let titleClickAudio

function playReusable(audio, path, volume) {
  const instance = audio || new Audio(path)
  instance.volume = volume
  instance.currentTime = 0
  instance.play().catch(() => {})
  return instance
}

export function playCashRegister() {
  cashRegisterAudio = playReusable(cashRegisterAudio, '/sounds/CashRegister.mp3', 0.55)
}

export function playCashOut() {
  cashOutAudio = playReusable(cashOutAudio, '/sounds/CashOut.mp3', 0.5)
}

export function playNewsUpdate() {
  newsUpdateAudio = playReusable(newsUpdateAudio, '/sounds/NewsUpdate.mp3', 0.55)
}

export function playMarketCountdown() {
  marketCountdownAudio = playReusable(marketCountdownAudio, '/sounds/MarketCloseCountdown.mp3', 0.6)
}

export function playTitleHover() {
  titleHoverAudio = playReusable(titleHoverAudio, '/sounds/TitleMouseHover.mp3', 0.28)
}

export function playTitleClick() {
  titleClickAudio = playReusable(titleClickAudio, '/sounds/TitleMouseClick.mp3', 0.42)
}
