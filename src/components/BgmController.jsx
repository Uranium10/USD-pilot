import { useEffect } from 'react'
import { bgmPlayer } from '../services/bgmService.js'
import { useGameStore } from '../store/gameStore.js'

export default function BgmController() {
  const phase = useGameStore((state) => state.phase)
  const mode = phase === 'premarket' || phase === 'day' || phase === 'dayReport' ? 'chart' : phase === 'night' ? 'night' : null

  useEffect(() => { bgmPlayer.setMode(mode) }, [mode])
  useEffect(() => {
    const unlock = () => bgmPlayer.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])
  return null
}
