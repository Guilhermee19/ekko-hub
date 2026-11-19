import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { reducedMotion } from './motion'

/** Movement (px) before a press becomes a drag; below it, clicks stay clicks. */
const THRESHOLD = 5
/** Presses on these never start a drag (arrows, switches, links inside a row). */
const INTERACTIVE = 'button, input, select, textarea, a, [role="switch"]'
const GLIDE = { duration: 180, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' }

const same = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((v, i) => v === b[i])

/** `list` with `id` moved to `index`. */
export function moveTo<T>(list: readonly T[], id: T, index: number): T[] {
  const rest = list.filter((v) => v !== id)
  rest.splice(index, 0, id)
  return rest
}

/** Floating copy of the item that follows the pointer; returns a mover and a remover. */
function makeGhost(node: HTMLElement, x: number, y: number) {
  const r = node.getBoundingClientRect()
  const ghost = node.cloneNode(true) as HTMLElement
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    margin: '0',
    zIndex: '9999',
    pointerEvents: 'none',
    opacity: '0.92',
    boxShadow: '0 12px 32px rgb(0 0 0 / 0.45)',
    transform: 'scale(1.03)',
    transition: 'none',
    animation: 'none',
  })
  ghost.setAttribute('aria-hidden', 'true')
  document.body.appendChild(ghost)
  return {
    move: (px: number, py: number) => {
      ghost.style.transform = `translate(${px - x}px, ${py - y}px) scale(1.03)`
    },
    remove: () => ghost.remove(),
  }
}

/**
 * Drag-to-reorder with a live preview: while dragging, the other items make room
 * (gliding into place) and a copy of the item follows the pointer, so the list already
 * shows how it will look on release. Pointer events on the window, because HTML5 drag
 * and drop does not reach the page in the app (on Windows, Tauri's file-drop handler
 * takes it over; the notch needs that handler for the shelf).
 */
export function useSortable<T extends string>(items: readonly T[], onReorder: (next: T[]) => void) {
  const nodes = useRef(new Map<T, HTMLElement>())
  const before = useRef<Map<T, DOMRect> | null>(null)
  const [dragging, setDragging] = useState<T | null>(null)
  /** Preview order while dragging. */
  const [order, setOrder] = useState<T[] | null>(null)
  /** Order just dropped, shown until the saved settings come back with it. */
  const [held, setHeld] = useState<T[] | null>(null)
  if (held && same(held, items)) setHeld(null)
  const list = order ?? held ?? items

  // Handlers on `window` read the freshest values through this.
  const latest = useRef({ list, items, onReorder })
  useLayoutEffect(() => {
    latest.current = { list, items, onReorder }
  })

  // FLIP: items that changed place start where they were and glide to the new slot.
  useLayoutEffect(() => {
    const rects = before.current
    before.current = null
    if (!rects || reducedMotion()) return
    for (const [id, node] of nodes.current) {
      const was = rects.get(id)
      if (!was) continue
      const now = node.getBoundingClientRect()
      const dx = was.left - now.left
      const dy = was.top - now.top
      if (dx || dy)
        node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], GLIDE)
    }
  }, [list])

  const target = (x: number, y: number): T | null => {
    for (const [id, node] of nodes.current) {
      // An item still gliding sits over someone else's slot: it would bounce back.
      if (node.getAnimations().length > 0) continue
      const r = node.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id
    }
    return null
  }

  const start = (id: T, e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as Element).closest(INTERACTIVE)) return
    const from = { x: e.clientX, y: e.clientY }
    let preview: T[] | null = null
    let ghost: ReturnType<typeof makeGhost> | null = null

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return
      if (!preview) {
        if (Math.hypot(ev.clientX - from.x, ev.clientY - from.y) < THRESHOLD) return
        const node = nodes.current.get(id)
        if (node) ghost = makeGhost(node, from.x, from.y)
        preview = [...latest.current.list]
        setDragging(id)
        setOrder(preview)
      }
      ghost?.move(ev.clientX, ev.clientY)
      // Over another item: take its slot. Over itself (where it already went): stay.
      const over = target(ev.clientX, ev.clientY)
      if (!over || over === id) return
      const index = preview.indexOf(over)
      if (index < 0) return
      before.current = new Map([...nodes.current].map(([k, n]) => [k, n.getBoundingClientRect()]))
      preview = moveTo(preview, id, index)
      setOrder(preview)
    }
    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      ghost?.remove()
      if (commit && preview && !same(preview, latest.current.items)) {
        setHeld(preview)
        latest.current.onReorder(preview)
      }
      setDragging(null)
      setOrder(null)
    }
    const up = () => finish(true)
    const cancel = () => finish(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }

  /** Spread on each item (or on its grip). */
  const handle = (id: T) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => start(id, e),
  })

  /** `ref` for each item, so the drag can find what is under the pointer. */
  const itemRef = (id: T) => (node: HTMLElement | null) => {
    if (node) nodes.current.set(id, node)
    else nodes.current.delete(id)
  }

  return { list, dragging, handle, itemRef }
}
