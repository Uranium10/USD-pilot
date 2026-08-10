import tracks from 'virtual:bgm-tracks'

const DEFAULT_VOLUME = 0.18
const VOLUME_KEY = 'usd-bgm-volume'
const MUTED_KEY = 'usd-bgm-muted'

const clampVolume = (value) => Math.min(1, Math.max(0, Number(value) || 0))

function readPreference(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : value
  } catch {
    return fallback
  }
}

function writePreference(key, value) {
  try { window.localStorage.setItem(key, String(value)) } catch { /* 저장소 차단 시 현재 세션만 유지 */ }
}

class BgmPlayer {
  constructor() {
    this.audio = new Audio()
    this.audio.preload = 'auto'
    this.volume = clampVolume(readPreference(VOLUME_KEY, DEFAULT_VOLUME))
    this.muted = readPreference(MUTED_KEY, 'false') === 'true'
    this.audio.volume = this.volume
    this.audio.muted = this.muted
    this.audio.addEventListener('ended', () => this.playNext())
    this.mode = null
    this.queue = []
    this.lastTrack = null
    this.blocked = false
    this.unlockListenersInstalled = false
    this.audioContext = null
    this.sourceNode = null
    this.highpassNode = null
    this.lowpassNode = null
    this.roomFiltered = false
  }

  getVolume() {
    return this.volume
  }

  isMuted() {
    return this.muted
  }

  setVolume(value, { persist = true } = {}) {
    this.volume = clampVolume(value)
    this.audio.volume = this.volume
    if (persist) writePreference(VOLUME_KEY, this.volume)
  }

  setMuted(muted) {
    this.muted = Boolean(muted)
    this.audio.muted = this.muted
    writePreference(MUTED_KEY, this.muted)
  }

  toggleMuted() {
    this.setMuted(!this.muted)
    return this.muted
  }

  shuffled(items) {
    const result = [...items]
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1))
      ;[result[index], result[swap]] = [result[swap], result[index]]
    }
    if (result.length > 1 && result[0] === this.lastTrack) [result[0], result[1]] = [result[1], result[0]]
    return result
  }

  setMode(mode) {
    if (this.mode === mode) return
    this.audio.pause()
    this.mode = mode
    this.queue = []
    this.blocked = false
    if (mode) this.playNext()
  }

  installUnlockListeners() {
    if (this.unlockListenersInstalled) return
    this.unlockListenersInstalled = true
    const unlock = () => this.unlock()
    // 자동재생 정책에 막힌 경우 사용자의 가장 첫 입력에서 즉시 재시도한다.
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
  }

  boot(mode) {
    this.installUnlockListeners()
    this.setMode(mode)
  }

  ensureAudioGraph() {
    if (this.audioContext) return true
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return false
    try {
      this.audioContext = new AudioContextClass()
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio)
      this.highpassNode = this.audioContext.createBiquadFilter()
      this.lowpassNode = this.audioContext.createBiquadFilter()
      this.highpassNode.type = 'highpass'
      this.lowpassNode.type = 'lowpass'
      this.highpassNode.frequency.value = 20
      this.lowpassNode.frequency.value = 20000
      this.highpassNode.Q.value = 0.72
      this.lowpassNode.Q.value = 0.72
      this.sourceNode.connect(this.highpassNode)
      this.highpassNode.connect(this.lowpassNode)
      this.lowpassNode.connect(this.audioContext.destination)
      return true
    } catch {
      this.audioContext = null
      this.sourceNode = null
      this.highpassNode = null
      this.lowpassNode = null
      return false
    }
  }

  setRoomFilter(active) {
    this.roomFiltered = Boolean(active)
    // 초기 타이틀 자동재생은 Web Audio 컨텍스트가 사용자 입력 전에 출력을 가로채지 않게 둔다.
    if (!this.audioContext && !this.roomFiltered) return
    if (!this.ensureAudioGraph()) return
    this.audioContext.resume().catch(() => {})
    const now = this.audioContext.currentTime
    const highpassTarget = this.roomFiltered ? 180 : 20
    const lowpassTarget = this.roomFiltered ? 1400 : 20000
    this.highpassNode.frequency.cancelScheduledValues(now)
    this.lowpassNode.frequency.cancelScheduledValues(now)
    this.highpassNode.frequency.setTargetAtTime(highpassTarget, now, 0.16)
    this.lowpassNode.frequency.setTargetAtTime(lowpassTarget, now, 0.16)
  }

  playNext() {
    const available = tracks[this.mode] || []
    if (!this.mode || available.length === 0) return
    if (this.queue.length === 0) this.queue = this.shuffled(available)
    const nextTrack = this.queue.shift()
    this.lastTrack = nextTrack
    this.audio.src = nextTrack
    this.audio.load()
    this.audio.play().then(() => { this.blocked = false }).catch(() => { this.blocked = true })
  }

  unlock() {
    if (!this.mode) return
    if (this.ensureAudioGraph()) {
      this.audioContext.resume().catch(() => {})
      this.setRoomFilter(this.roomFiltered)
    }
    if (!this.audio.src) this.playNext()
    else if (this.blocked || this.audio.paused) this.audio.play().then(() => { this.blocked = false }).catch(() => {})
  }
}

export const bgmPlayer = new BgmPlayer()
