import { useEffect, useRef } from 'react'
import { DAY_DURATION_SECONDS } from '../config.js'
import { useGameStore } from '../store/gameStore.js'

export default function StockChart() {
  const canvasRef = useRef(null)

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
      const prices = visible.map((point) => point.price)
      const min = Math.min(...prices) * 0.98
      const max = Math.max(...prices) * 1.02
      context.beginPath()
      visible.forEach((point, index) => {
        const x = (point.progress / progress) * width
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
  }, [])

  return <canvas ref={canvasRef} className="stock-chart" aria-label="선택 종목 가격 차트" />
}

