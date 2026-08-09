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
    this.volume = clampVolume(readPreference(VOLUME_KEY, DEFAULT_VOLUME))
    this.muted = readPreference(MUTED_KEY, 'false') === 'true'
    this.audio.volume = this.volume
    this.audio.muted = this.muted
    this.audio.addEventListener('ended', () => this.playNext())
    this.mode = null
    this.queue = []
    this.lastTrack = null
    this.blocked = false
  }

  getVolume() {
    return this.volume
  }

  isMuted() {
    return this.muted
  }

  setVolume(value) {
    this.volume = clampVolume(value)
    this.audio.volume = this.volume
    writePreference(VOLUME_KEY, this.volume)
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

  playNext() {
    const available = tracks[this.mode] || []
    if (!this.mode || available.length === 0) return
    if (this.queue.length === 0) this.queue = this.shuffled(available)
    const nextTrack = this.queue.shift()
    this.lastTrack = nextTrack
    this.audio.src = nextTrack
    this.audio.play().then(() => { this.blocked = false }).catch(() => { this.blocked = true })
  }

  unlock() {
    if (!this.mode) return
    if (!this.audio.src) this.playNext()
    else if (this.blocked || this.audio.paused) this.audio.play().then(() => { this.blocked = false }).catch(() => {})
  }
}

export const bgmPlayer = new BgmPlayer()
