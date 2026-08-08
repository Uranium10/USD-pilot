import { TICK_MS } from '../config.js'
import { useGameStore } from '../store/gameStore.js'

class StageEngine {
  timer = null
  lastTime = 0

  start() {
    if (this.timer) return
    this.lastTime = performance.now()
    this.timer = window.setInterval(() => {
      const now = performance.now()
      const delta = (now - this.lastTime) / 1000
      this.lastTime = now
      useGameStore.getState().engineTick(delta)
    }, TICK_MS)
  }

  stop() {
    if (!this.timer) return
    window.clearInterval(this.timer)
    this.timer = null
  }
}

export const stageEngine = new StageEngine()

