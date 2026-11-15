import { useEffect, useRef, useState } from 'react'

/**
 * Size of the element the ref is attached to. Surfaces measure themselves instead of the
 * window, so they work the same in their Tauri window and inside the gallery mockup.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, ...size }
}
