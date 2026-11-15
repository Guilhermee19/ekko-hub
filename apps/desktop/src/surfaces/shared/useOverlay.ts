import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { backend, type HitRect } from '@/lib/ipc'

interface HoverOptions {
  /** Wait before opening, so passing by (e.g. to browser tabs) does not pop it. */
  enterDelay?: number
  leaveDelay?: number
  /** Off = hover never reports true (notch "open on click" setting). */
  enabled?: boolean
}

/**
 * Hover state for overlay windows. In Tauri the cursor is tracked by the backend (the
 * window is click-through); in the browser gallery the DOM events below are used.
 */
export function useOverlayHover({
  enterDelay = 180,
  leaveDelay = 320,
  enabled = true,
}: HoverOptions = {}) {
  const [hovered, setHovered] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const update = (inside: boolean) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setHovered(inside), inside ? enterDelay : leaveDelay)
  }
  const updateRef = useLatest(update)

  useEffect(() => {
    if (backend.kind !== 'tauri') return
    const off = backend.onHover((inside) => updateRef.current(inside))
    return () => {
      void off.then((f) => f())
      window.clearTimeout(timer.current)
    }
  }, [updateRef])

  const bind =
    backend.kind === 'mock'
      ? { onMouseEnter: () => update(true), onMouseLeave: () => update(false) }
      : {}

  return { hovered: hovered && enabled, bind }
}

/** Keeps the backend's click-through area in sync with what is visible. */
export function useHitRect(rect: HitRect) {
  const { x, y, w, h } = rect
  useEffect(() => {
    // Wall-clock µs: increases across reloads too, so the backend can drop stale calls.
    const seq = Math.floor((performance.timeOrigin + performance.now()) * 1000)
    void backend.setHitRect({ x, y, w, h, seq })
  }, [x, y, w, h])
}

/** Tracks whether this window has keyboard focus (Tauri) / the page is focused (mock). */
export function useWindowFocus(onChange: (focused: boolean) => void) {
  const ref = useLatest(onChange)
  useEffect(() => {
    const off = backend.onFocusChanged((f) => ref.current(f))
    return () => void off.then((f) => f())
  }, [ref])
}

/** Runs `cb` when Ekko is summoned (tray click / global hotkey). */
export function useSummon(cb: () => void) {
  const ref = useLatest(cb)
  useEffect(() => {
    const off = backend.onSummon(() => ref.current())
    return () => void off.then((f) => f())
  }, [ref])
}

/** Esc handler for transient surfaces. */
export function useEscape(cb: () => void) {
  const ref = useLatest(cb)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && ref.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ref])
}

/** Ref always pointing at the latest value, updated after render (React 19 rule). */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
