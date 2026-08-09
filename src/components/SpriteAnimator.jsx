import React, { useEffect, useState } from 'react'

/**
 * SpriteAnimator - 2D 애니메이션 재생기
 * 
 * @param {Object} props
 * @param {'strip' | 'frames'} props.type - 'strip': 단일 이미지(스프라이트 시트) / 'frames': 여러 이미지 URL 배열
 * @param {string | string[]} props.src - 이미지 URL 또는 배열
 * @param {number} props.width - 한 프레임의 가로 픽셀 크기
 * @param {number} props.height - 한 프레임의 세로 픽셀 크기
 * @param {number} [props.fps=12] - 초당 프레임 수
 * @param {boolean} [props.playing=true] - 재생 여부
 * @param {boolean} [props.loop=true] - 반복 재생 여부
 * @param {number} [props.frameCount=0] - 총 프레임 수 (type='strip' 일 때 필수)
 * @param {number} [props.columns=0] - 가로 열 갯수 (기본값: frameCount, 가로 한 줄짜리 스트립)
 * @param {Function} [props.onComplete] - 애니메이션 종료 시 콜백 (loop=false 일 때 유효)
 */
export default function SpriteAnimator({
  type = 'strip',
  src,
  width,
  height,
  fps = 12,
  playing = true,
  loop = true,
  frameCount = 0,
  columns = 0,
  onComplete,
  className = '',
  style = {}
}) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const totalFrames = type === 'frames' ? (Array.isArray(src) ? src.length : 0) : frameCount
  const cols = columns || totalFrames

  useEffect(() => {
    if (playing) {
      setCurrentFrame(0)
    }
  }, [playing, src])
  
  useEffect(() => {
    if (!playing || totalFrames <= 1) return

    let animationFrameId
    let lastTime = performance.now()
    const frameInterval = 1000 / fps

    const updateFrame = (time) => {
      if (time - lastTime >= frameInterval) {
        lastTime = time
        // onComplete는 여기서 바로 부르지 않는다 — 이 콜백은 setCurrentFrame의 업데이터 함수라
        // 렌더링 도중 실행될 수 있고, 그 안에서 부모 컴포넌트의 상태를 바꾸면 React가
        // "다른 컴포넌트 렌더링 중 상태 업데이트" 경고를 낸다. 프레임 값만 갱신하고,
        // 실제 onComplete 호출은 아래의 별도 effect(커밋 이후)로 미룬다.
        setCurrentFrame((prev) => {
          const nextFrame = prev + 1
          if (nextFrame >= totalFrames) return loop ? 0 : prev
          return nextFrame
        })
      }
      animationFrameId = requestAnimationFrame(updateFrame)
    }

    animationFrameId = requestAnimationFrame(updateFrame)
    return () => cancelAnimationFrame(animationFrameId)
  }, [playing, fps, totalFrames, loop])

  useEffect(() => {
    if (loop || totalFrames <= 1) return
    if (currentFrame === totalFrames - 1) onComplete?.()
  }, [currentFrame, loop, totalFrames, onComplete])

  if (totalFrames === 0 || !src) return null

  if (type === 'frames') {
    return (
      <div 
        className={`sprite-animator ${className}`} 
        style={{ width, height, overflow: 'hidden', display: 'inline-block', ...style }}
      >
        <img 
          src={src[currentFrame]} 
          alt={`frame-${currentFrame}`} 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    )
  }

  // Type: strip (Sprite Sheet)
  const colIndex = currentFrame % cols
  const rowIndex = Math.floor(currentFrame / cols)
  const rows = cols ? Math.ceil(totalFrames / cols) : 0

  const bgX = -(colIndex * width)
  const bgY = -(rowIndex * height)

  return (
    <div
      className={`sprite-animator ${className}`}
      style={{
        width,
        height,
        backgroundImage: `url(${src})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        // 세로도 rows*height로 고정해야 한다. 'auto'로 두면 원본 이미지의 실제 비율이
        // 의도한 그리드(cols×rows)와 다를 때 아래쪽 줄 프레임이 밀려 보인다.
        backgroundSize: cols && rows ? `${cols * width}px ${rows * height}px` : 'auto',
        backgroundRepeat: 'no-repeat',
        display: 'inline-block',
        ...style
      }}
    />
  )
}
