import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { bgmPlayer } from './services/bgmService.js'
import { startViewportScale } from './services/viewportScale.js'

// 저장 세션 조회와 게임·시장 모듈 평가보다 먼저 타이틀 음원 로딩/재생을 요청한다.
bgmPlayer.boot('title')

// React가 마운트되기 전에 --game-scale을 정해둔다. 첫 페인트부터 올바른 배율로 그려져
// 화면이 커졌다 줄어드는 깜빡임이 생기지 않는다.
startViewportScale()

import('./App.jsx').then(({ default: App }) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
