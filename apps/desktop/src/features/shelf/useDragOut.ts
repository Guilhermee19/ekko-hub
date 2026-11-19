import { useRef, type PointerEvent } from 'react'
import { useShelf } from './store'

const THRESHOLD = 5

/**
 * Press and move a few px = native drag of the files out of Ekko (to Explorer, the
 * desktop, an e-mail…). A press without movement stays a click. Stops propagation so
 * the notch top bar doesn't start moving the notch instead.
 */
export function useDragOut(ids?: string[]) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      e.stopPropagation()
      start.current = { x: e.clientX, y: e.clientY }
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s) return
      if ((e.buttons & 1) === 0) {
        start.current = null
        return
      }
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < THRESHOLD) return
      start.current = null
      useShelf.getState().dragOut(ids)
    },
    onPointerUp: () => {
      start.current = null
    },
  }
}
