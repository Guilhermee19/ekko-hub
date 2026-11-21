import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { backend, type CaptureFrame } from '@/lib/ipc'
import { reducedMotion } from '@/lib/motion'

/** Grid side of the loupe (matches LOUPE_RADIUS = 5 in services/colors.rs). */
const SIDE = 11
const CELL = 12
const GAP = 22

interface Point {
  x: number
  y: number
}

/**
 * Eyedropper over the frozen screen: a ring where the cursor is and a loupe with the
 * pixels around it, magnified, plus the color code. Click or Enter picks, the arrows
 * nudge one pixel (Shift: ten), Esc cancels (CaptureSurface).
 */
export function ColorPicker({ frame }: { frame: CaptureFrame }) {
  // Frame pixels per CSS pixel, per axis (the frozen image fills the window).
  const sx = frame.width / window.innerWidth
  const sy = frame.height / window.innerHeight
  const [pos, setPos] = useState<Point>({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const [grid, setGrid] = useState<(string | null)[]>([])
  const loupe = useRef<HTMLDivElement>(null)
  const want = useRef<Point>(pos)
  const busy = useRef(false)
  const picking = useRef(false)

  const at = (p: Point) => ({
    x: Math.min(frame.width - 1, Math.max(0, Math.floor(p.x * sx))),
    y: Math.min(frame.height - 1, Math.max(0, Math.floor(p.y * sy))),
  })

  /** One loupe request at a time; the latest position wins. */
  const refresh = () => {
    if (busy.current) return
    busy.current = true
    const asked = want.current
    const { x, y } = at(asked)
    void backend
      .colorLoupe(x, y)
      .then(setGrid)
      .finally(() => {
        busy.current = false
        if (want.current !== asked) refresh()
      })
  }
  const refreshRef = useRef(refresh)
  useEffect(() => {
    refreshRef.current = refresh
  })

  const moveTo = (p: Point) => {
    want.current = p
    setPos(p)
    refreshRef.current()
  }

  const pick = async () => {
    if (picking.current) return
    picking.current = true
    // A quick pop on the loupe, then the backend closes the overlay.
    if (loupe.current?.animate && !reducedMotion())
      await loupe.current.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.08)', opacity: 0 }],
        { duration: 160, easing: 'ease-in', fill: 'forwards' },
      ).finished
    const { x, y } = at(want.current)
    try {
      await backend.colorPick(x, y)
    } catch {
      picking.current = false
    }
  }
  const pickRef = useRef(pick)
  useEffect(() => {
    pickRef.current = pick
  })

  useEffect(() => {
    refreshRef.current()
    const keys = (e: KeyboardEvent) => {
      const n = e.shiftKey ? 10 : 1
      const p = want.current
      const nudge: Record<string, Point> = {
        ArrowLeft: { x: p.x - n / sx, y: p.y },
        ArrowRight: { x: p.x + n / sx, y: p.y },
        ArrowUp: { x: p.x, y: p.y - n / sy },
        ArrowDown: { x: p.x, y: p.y + n / sy },
      }
      if (nudge[e.key]) {
        e.preventDefault()
        moveTo(nudge[e.key])
      } else if (e.key === 'Enter') void pickRef.current()
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [sx, sy])

  const center = grid[Math.floor((SIDE * SIDE) / 2)] ?? null
  const size = SIDE * CELL
  // The loupe sits below-right of the cursor and flips near the screen edges.
  const left = pos.x + GAP + size > window.innerWidth ? pos.x - GAP - size : pos.x + GAP
  const top = pos.y + GAP + size + 44 > window.innerHeight ? pos.y - GAP - size - 44 : pos.y + GAP

  return (
    <div
      className="fixed inset-0 cursor-none select-none"
      onPointerMove={(e: PointerEvent) => moveTo({ x: e.clientX, y: e.clientY })}
      onPointerDown={(e: PointerEvent) => e.button === 0 && void pick()}
    >
      <img src={frame.url} alt="" draggable={false} className="absolute inset-0 size-full" />
      <p className="animate-rise-in pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-4 py-2 text-[13px] text-content shadow-lg">
        Clique para pegar a cor · setas ajustam 1 px · Esc cancela
      </p>
      {/* The ring marks the exact pixel; its border is the color under it. */}
      <span
        className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.6),inset_0_0_0_1px_rgb(255_255_255/0.6)]"
        style={{ left: pos.x, top: pos.y, borderColor: center ?? 'transparent' }}
      />
      <div
        ref={loupe}
        className="ekko-shell animate-pop-in pointer-events-none absolute overflow-hidden border border-border-soft p-1.5"
        style={{ left, top }}
      >
        <div
          className="relative grid overflow-hidden rounded-[10px]"
          style={{ gridTemplateColumns: `repeat(${SIDE}, ${CELL}px)`, width: size, height: size }}
        >
          {Array.from({ length: SIDE * SIDE }, (_, i) => (
            <span key={i} style={{ background: grid[i] ?? 'transparent' }} />
          ))}
          <span
            className="absolute border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.7)]"
            style={{
              left: Math.floor(SIDE / 2) * CELL - 1,
              top: Math.floor(SIDE / 2) * CELL - 1,
              width: CELL + 2,
              height: CELL + 2,
            }}
          />
        </div>
        <div className="flex items-center gap-2 px-1 pt-2 pb-0.5">
          <span
            className="size-4 shrink-0 rounded-full border border-white/30"
            style={{ background: center ?? 'transparent' }}
          />
          <span className="font-mono text-[13px] font-semibold text-content uppercase tabular-nums">
            {center ?? '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
