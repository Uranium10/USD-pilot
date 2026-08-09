let cashRegisterAudio
let newsUpdateAudio
let marketCountdownAudio

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

export function playNewsUpdate() {
  newsUpdateAudio = playReusable(newsUpdateAudio, '/sounds/NewsUpdate.mp3', 0.55)
}

export function playMarketCountdown() {
  marketCountdownAudio = playReusable(marketCountdownAudio, '/sounds/MarketCloseCountdown.mp3', 0.6)
}
