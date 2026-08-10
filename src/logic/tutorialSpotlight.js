const finitePositive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback

/**
 * getBoundingClientRect()의 뷰포트 픽셀을 transform 전 오버레이 CSS 좌표로 바꾼다.
 */
export function tutorialSpotlightRect({ overlayRect, targetRect, overlayWidth, overlayHeight, padding }) {
  const width = finitePositive(overlayWidth, overlayRect.width)
  const height = finitePositive(overlayHeight, overlayRect.height)
  const scaleX = width / finitePositive(overlayRect.width, width)
  const scaleY = height / finitePositive(overlayRect.height, height)
  const left = Math.max(0, (targetRect.left - overlayRect.left) * scaleX - padding)
  const top = Math.max(0, (targetRect.top - overlayRect.top) * scaleY - padding)
  const right = Math.min(width, (targetRect.right - overlayRect.left) * scaleX + padding)
  const bottom = Math.min(height, (targetRect.bottom - overlayRect.top) * scaleY + padding)

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}
