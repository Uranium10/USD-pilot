import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { bgmPlayer } from './services/bgmService.js'

// 저장 세션 조회와 게임·시장 모듈 평가보다 먼저 타이틀 음원 로딩/재생을 요청한다.
bgmPlayer.boot('title')

import('./App.jsx').then(({ default: App }) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
