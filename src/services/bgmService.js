import tracks from 'virtual:bgm-tracks'

class BgmPlayer {
  constructor() {
    this.audio = new Audio()
    this.audio.volume = 0.35
    this.audio.addEventListener('ended', () => this.playNext())
    this.mode = null
    this.queue = []
    this.lastTrack = null
    this.blocked = false
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
