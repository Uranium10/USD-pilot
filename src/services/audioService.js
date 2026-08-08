let cashRegisterAudio

export function playCashRegister() {
  if (!cashRegisterAudio) {
    cashRegisterAudio = new Audio('/sounds/CashRegister.mp3')
    cashRegisterAudio.volume = 0.55
  }
  cashRegisterAudio.currentTime = 0
  cashRegisterAudio.play().catch(() => {})
}
