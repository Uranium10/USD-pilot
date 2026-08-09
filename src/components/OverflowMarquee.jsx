import { useLayoutEffect, useRef, useState } from 'react'

export default function OverflowMarquee({ as: Tag = 'span', className = '', children }) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const [overflow, setOverflow] = useState(0)

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current
      const content = contentRef.current
      if (!container || !content) return
      setOverflow(Math.max(0, Math.ceil(content.scrollWidth - container.clientWidth)))
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (observer) {
      observer.observe(containerRef.current)
      observer.observe(contentRef.current)
    } else window.addEventListener('resize', measure)
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {})
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [children])

  const duration = Math.max(8, 7 + overflow / 24)
  return <Tag
    ref={containerRef}
    className={`overflow-marquee ${overflow > 0 ? 'is-overflowing' : ''} ${className}`.trim()}
    style={{ '--marquee-distance': `${overflow}px`, '--marquee-duration': `${duration}s` }}
    title={overflow > 0 ? String(children) : undefined}
  ><span ref={contentRef}>{children}</span></Tag>
}
