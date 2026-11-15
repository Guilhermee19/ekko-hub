import { useRef, useState, type PointerEvent } from 'react'
import { backend } from '@/lib/ipc'

const THRESHOLD = 4

/**
 * Drag handle for the notch: moving more than a few px drags it along the top edge
 * (and across monitors); a press without movement counts as a tap.
 */
export function useNotchDrag(onTap: () => void) {
  const start = useRef<{ x: number; dragging: boolean } | null>(null)
  const frame = useRef(0)
  const [dragging, setDragging] = useState(false)

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    start.current = { x: e.screenX, dragging: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = start.current
    if (!s) return
    const dx = e.screenX - s.x
    if (!s.dragging) {
      if (Math.abs(dx) < THRESHOLD) return
      s.dragging = true
      setDragging(true)
      void backend.notchDrag('start', 0)
    }
    // One move per frame is plenty; the backend reads the real cursor anyway.
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => void backend.notchDrag('move', dx))
  }

  const finish = (e: PointerEvent<HTMLElement>, tap: boolean) => {
    const s = start.current
    start.current = null
    cancelAnimationFrame(frame.current)
    if (!s) return
    if (s.dragging) {
      setDragging(false)
      void backend.notchDrag('end', e.screenX - s.x)
    } else if (tap) {
      onTap()
    }
  }

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: PointerEvent<HTMLElement>) => finish(e, true),
      onPointerCancel: (e: PointerEvent<HTMLElement>) => finish(e, false),
    },
  }
}
