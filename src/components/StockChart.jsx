import { useEffect, useRef, useState } from 'react'
import { DAY_DURATION_SECONDS } from '../config.js'
import { formatMarketTime } from '../logic/marketClock.js'
import { useGameStore } from '../store/gameStore.js'

// 시간축도 작업표시줄·속보와 같은 장 시계를 쓴다. 예전에는 여기만 실시간 경과 초를
// 그대로 보여줘서(`1일 2:30`) 한 화면이 서로 다른 두 시간을 말했다.
const formatTimeline = (time) => `${Math.floor(time) + 1}일 ${formatMarketTime(time % 1)}`

function buildSeries(state, progress, stockId) {
  const series = []
  for (let dayIndex = 0; dayIndex < state.day; dayIndex += 1) {
    const stock = state.market.days[dayIndex].stocks.find((item) => item.id === stockId)
    if (!stock) continue
    const limit = dayIndex < state.day - 1 ? 1 : progress
    stock.path.filter((point) => point.progress <= limit).forEach((point) => {
      series.push({ time: dayIndex + point.progress, price: point.price })
    })
    if (dayIndex === state.day - 1) {
      series.push({ time: dayIndex + progress, price: state.currentPrices[stock.id] || stock.startPrice })
    }
  }
  return series
}

export default function StockChart({ stockId, compact = false }) {
  const canvasRef = useRef(null)
  const hoverRatioRef = useRef(null)
  const priceScaleRef = useRef({ key: '', min: 0, max: 0 })
  const [zoomLevel, setZoomLevel] = useState(1)

  useEffect(() => {
    let frame
    const draw = () => {
      const canvas = canvasRef.current
      const state = useGameStore.getState()
      const targetStockId = stockId || state.selectedStockId
      const stock = state.market?.days[state.day - 1]?.stocks.find((item) => item.id === targetStockId)
      if (!canvas || !stock) {
        frame = requestAnimationFrame(draw)
        return
      }

      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
        canvas.width = Math.round(rect.width * ratio)
        canvas.height = Math.round(rect.height * ratio)
      }
      const context = canvas.getContext('2d')
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      const width = rect.width
      const height = rect.height
      context.clearRect(0, 0, width, height)
      context.shadowBlur = 0

      context.strokeStyle = '#233147'
      context.lineWidth = 1
      for (let row = 1; row < 5; row += 1) {
        context.beginPath()
        context.moveTo(0, height * row / 5)
        context.lineTo(width, height * row / 5)
        context.stroke()
      }

      const progress = Math.max(0.002, state.elapsed / DAY_DURATION_SECONDS)
      const currentTime = state.day - 1 + progress

      // 줌 레벨 1(최소 줌)에서는 startTime이 0이 되어 지나온 전체 구간이 보인다.
      // 줌을 당길수록 timeSpan이 줄어 최근 구간만 보인다.
      const timeSpan = Math.max(0.002, currentTime / zoomLevel)
      const startTime = Math.max(0, currentTime - timeSpan)

      const series = buildSeries(state, progress, targetStockId)
      // 화면 왼쪽 경계(startTime)에서 선이 잘려 보이지 않도록, 경계를 가로지르는 구간을
      // 보간해 정확히 그 위치에 점을 하나 만들어 끼워 넣는다(버퍼링 값으로 대충 자르지 않는다).
      const cropIndex = series.findIndex((point) => point.time >= startTime)
      let visible
      if (cropIndex <= 0) {
        visible = series
      } else {
        const prev = series[cropIndex - 1]
        const next = series[cropIndex]
        const ratio = next.time === prev.time ? 0 : (startTime - prev.time) / (next.time - prev.time)
        const boundaryPoint = { time: startTime, price: prev.price + (next.price - prev.price) * ratio }
        visible = [boundaryPoint, ...series.slice(cropIndex)]
      }
      if (visible.length === 0 && series.length > 0) visible = [series[series.length - 1]]

      const prices = visible.map((point) => point.price)
      const desiredMin = Math.min(...prices) * 0.98
      const desiredMax = Math.max(...prices) * 1.02
      const scaleKey = `${targetStockId}:${state.day}:${zoomLevel}:${compact}`
      const scale = priceScaleRef.current
      if (scale.key !== scaleKey || !Number.isFinite(scale.min) || !Number.isFinite(scale.max)) {
        priceScaleRef.current = { key: scaleKey, min: desiredMin, max: desiredMax }
      } else {
        const minBlend = desiredMin < scale.min ? 0.18 : 0.025
        const maxBlend = desiredMax > scale.max ? 0.18 : 0.025
        scale.min += (desiredMin - scale.min) * minBlend
        scale.max += (desiredMax - scale.max) * maxBlend
      }
      const { min, max } = priceScaleRef.current
      
      const toX = (time) => ((time - startTime) / timeSpan) * width
      const toY = (price) => height - ((price - min) / Math.max(1, max - min)) * height

      context.fillStyle = '#8490a5'
      context.font = '10px "IBM Plex Mono"'
      if (!compact) {
        context.textAlign = 'right'
        context.fillText(`₡${max.toFixed(2)}`, width - 5, 15)
        context.fillText(`₡${min.toFixed(2)}`, width - 5, height - 20)
        context.textAlign = 'left'
        context.fillText(formatTimeline(startTime), 5, height - 5)
        context.textAlign = 'right'
        context.fillText(formatTimeline(currentTime), width - 5, height - 5)
      }

      context.beginPath()
      visible.forEach((point, index) => {
        const x = toX(point.time)
        const y = toY(point.price)
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      const currentPrice = state.currentPrices[stock.id] || stock.startPrice
      context.strokeStyle = currentPrice >= stock.startPrice ? '#4cffb2' : '#ff5277'
      context.lineWidth = compact ? 2 : 3
      context.shadowColor = context.strokeStyle
      context.shadowBlur = 10
      context.stroke()
      context.shadowBlur = 0

      if (!compact && hoverRatioRef.current !== null && visible.length > 0) {
        const hoverTime = startTime + hoverRatioRef.current * timeSpan
        const nearest = visible.reduce((best, point) => Math.abs(point.time - hoverTime) < Math.abs(best.time - hoverTime) ? point : best)
        const x = toX(nearest.time)
        const y = toY(nearest.price)
        context.strokeStyle = '#dce8ff'
        context.lineWidth = 1
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, height)
        context.stroke()
        context.fillStyle = '#dce8ff'
        context.beginPath()
        context.arc(x, y, 4, 0, Math.PI * 2)
        context.fill()

        const label = `${formatTimeline(nearest.time)}  ₡${nearest.price.toFixed(2)}`
        context.font = '11px "IBM Plex Mono"'
        const labelWidth = context.measureText(label).width + 14
        const labelX = Math.min(Math.max(4, x + 8), width - labelWidth - 4)
        const labelY = Math.max(6, y - 32)
        context.fillStyle = '#07101a'
        context.fillRect(labelX, labelY, labelWidth, 24)
        context.strokeStyle = '#dce8ff'
        context.strokeRect(labelX, labelY, labelWidth, 24)
        context.fillStyle = '#dce8ff'
        context.textAlign = 'left'
        context.fillText(label, labelX + 7, labelY + 16)
      }

      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [compact, stockId, zoomLevel])

  const updateHover = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    hoverRatioRef.current = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  }

  return (
    <div className={`chart-canvas-wrap ${compact ? 'compact' : ''}`}>
      <canvas ref={canvasRef} className="stock-chart" aria-label="선택 자산 가격 차트" onPointerMove={compact ? undefined : updateHover} onPointerLeave={compact ? undefined : () => { hoverRatioRef.current = null }} />
      {!compact && <div className="zoom-controls">
        <button onClick={() => setZoomLevel((value) => Math.max(1, value - 1))}>-</button>
        <button onClick={() => setZoomLevel((value) => Math.min(10, value + 1))}>+</button>
      </div>}
    </div>
  )
}
