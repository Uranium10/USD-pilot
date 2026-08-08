import { useEffect, useRef, useState } from 'react'
import { DAY_DURATION_SECONDS } from '../config.js'
import { useGameStore } from '../store/gameStore.js'

export default function StockChart() {
  const canvasRef = useRef(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  useEffect(() => {
    let frame
    const draw = () => {
      const canvas = canvasRef.current
      const state = useGameStore.getState()
      const stock = state.market?.days[state.day - 1]?.stocks.find((item) => item.id === state.selectedStockId)
      if (!canvas || !stock) {
        frame = requestAnimationFrame(draw)
        return
      }
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      if (canvas.width !== rect.width * ratio || canvas.height !== rect.height * ratio) {
        canvas.width = rect.width * ratio
        canvas.height = rect.height * ratio
      }
      const context = canvas.getContext('2d')
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      const width = rect.width
      const height = rect.height
      context.clearRect(0, 0, width, height)
      context.strokeStyle = '#233147'
      context.lineWidth = 1
      for (let row = 1; row < 5; row += 1) {
        context.beginPath(); context.moveTo(0, height * row / 5); context.lineTo(width, height * row / 5); context.stroke()
      }
      const progress = Math.max(0.002, state.elapsed / DAY_DURATION_SECONDS)
      const points = stock.path.filter((point) => point.progress <= progress)
      const lastKnown = { progress, price: state.currentPrices[stock.id] || stock.startPrice }
      const visible = [...points, lastKnown]

      // Zoom logic — 확대 시 실제로 보이는 구간만 잘라내고, 축 스케일도 그 구간 기준으로 다시 잡는다.
      const windowProgress = 1 / zoomLevel
      const startProgress = Math.max(0, progress - windowProgress)
      const zoomPoints = visible.filter((point) => point.progress >= startProgress)

      const prices = zoomPoints.map((point) => point.price)
      const min = Math.min(...prices) * 0.98
      const max = Math.max(...prices) * 1.02

      // Draw Y axis labels (price) — 우측 상단/중단에 표시하고, 시간 라벨과 겹치지 않도록 최저가 라벨은 하단에서 살짝 띄운다.
      context.fillStyle = '#8490a5'
      context.font = '10px "IBM Plex Mono"'
      context.textAlign = 'right'
      context.fillText(`₡${max.toFixed(2)}`, width - 5, 15)
      context.fillText(`₡${min.toFixed(2)}`, width - 5, height - 20)

      // Draw X axis labels (Time) — 좌측=보이는 구간의 시작 시각, 우측=현재 시각(차트 우측 끝 데이터 포인트와 위치 일치)
      const elapsedSeconds = progress * DAY_DURATION_SECONDS
      const startSeconds = startProgress * DAY_DURATION_SECONDS
      const formatTime = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`

      context.textAlign = 'left'
      context.fillText(formatTime(startSeconds), 5, height - 5)
      context.textAlign = 'right'
      context.fillText(formatTime(elapsedSeconds), width - 5, height - 5)

      context.beginPath()
      zoomPoints.forEach((point, index) => {
        const x = ((point.progress - startProgress) / (progress - startProgress)) * width
        const y = height - ((point.price - min) / Math.max(1, max - min)) * height
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y)
      })
      context.strokeStyle = lastKnown.price >= stock.startPrice ? '#4cffb2' : '#ff5277'
      context.lineWidth = 3
      context.shadowColor = context.strokeStyle
      context.shadowBlur = 10
      context.stroke()
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [zoomLevel])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} className="stock-chart" aria-label="선택 종목 가격 차트" />
      <div className="zoom-controls">
        <button onClick={() => setZoomLevel((z) => Math.max(1, z - 1))}>-</button>
        <button onClick={() => setZoomLevel((z) => Math.min(10, z + 1))}>+</button>
      </div>
    </div>
  )
}

