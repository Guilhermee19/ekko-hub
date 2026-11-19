import { useEffect, useRef, useState } from 'react'
import { reducedMotion as reduced } from '@/lib/motion'

/** Eases a number from its last value to `target` (instant with reduced motion). */
export function useCountUp(target: number, ms = 900) {
  const [shown, setShown] = useState(0)
  const last = useRef(0)
  useEffect(() => {
    if (reduced()) return
    const from = last.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const value = Math.round(from + (target - from) * (1 - (1 - t) ** 3))
      last.current = value
      setShown(value)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, ms])
  return reduced() ? target : shown
}
