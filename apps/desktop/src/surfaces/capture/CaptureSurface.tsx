import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { flight, isClick, rectFrom, toFrame, type Point } from '@/features/capture/selection'
import { backend, type CaptureFrame, type CaptureRegion } from '@/lib/ipc'
import { reducedMotion } from '@/lib/motion'
import './capture.css'

type Phase = 'pick' | 'saving' | 'error'

/**
 * Print overlay: the frozen monitor, dimmed; drag to pick an area (a click takes the
 * whole screen). On release the screen flashes, the print is saved and flies up to
 * the notch, where it waits to be copied or dragged. Esc cancels.
 */
export function CaptureSurface() {
  const [frame, setFrame] = useState<CaptureFrame | null>(null)
  const [from, setFrom] = useState<Point | null>(null)
  const [rect, setRect] = useState<CaptureRegion | null>(null)
  const [phase, setPhase] = useState<Phase>('pick')
  const flyer = useRef<HTMLDivElement>(null)

  // Hoisted (function) so the Esc listener below can use it.
  async function close(cancel: boolean) {
    setFrame(null)
    if (cancel) await backend.captureCancel()
    await backend.hideSelf()
  }

  useEffect(() => {
    const fresh = (f: CaptureFrame | null) => {
      setFrame(f)
      setFrom(null)
      setRect(null)
      setPhase('pick')
    }
    void backend.captureFrame().then(fresh)
    const off = backend.onCaptureStart(fresh)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && void close(true)
    window.addEventListener('keydown', esc)
    return () => {
      void off.then((f) => f())
      window.removeEventListener('keydown', esc)
    }
  }, [])

  const down = (e: PointerEvent) => {
    if (phase !== 'pick' || e.button !== 0) return
    setFrom({ x: e.clientX, y: e.clientY })
    setRect(null)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Pointer already gone: the selection still follows the window's moves.
    }
  }
  const move = (e: PointerEvent) => {
    if (from) setRect(rectFrom(from, { x: e.clientX, y: e.clientY }))
  }
  const up = async () => {
    if (!from || !frame) return
    setFrom(null)
    const view = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }
    const picked = rect && !isClick(rect) ? rect : view
    setRect(picked)
    setPhase('saving')
    try {
      await backend.captureCommit(toFrame(picked, frame.width / window.innerWidth))
    } catch {
      setPhase('error')
      setTimeout(() => void close(true), 1800)
      return
    }
    await fly(picked)
    void close(false)
  }

  /** The picked area shrinks toward the notch, as if it went into it. */
  const fly = async (r: CaptureRegion) => {
    const node = flyer.current
    if (!node || reducedMotion()) return
    const { dx, dy, scale } = flight(r, window.innerWidth)
    await node.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(6px) scale(1.02)', opacity: 1, offset: 0.25 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.2 },
      ],
      { duration: 520, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards' },
    ).finished
  }

  if (!frame) return null
  const scale = frame.width / window.innerWidth
  const label = rect && !isClick(rect) && toFrame(rect, scale)

  return (
    <div
      className="capture-root fixed inset-0 cursor-crosshair select-none"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={() => void up()}
    >
      <img src={frame.url} alt="" draggable={false} className="absolute inset-0 size-full" />
      {phase === 'pick' && (
        <>
          {/* The dimming is the selection's own shadow, so the picked area stays bright. */}
          <div
            className="capture-cut absolute"
            style={rect ? box(rect) : { left: 0, top: 0, width: 0, height: 0 }}
          />
          {label && rect && (
            <span
              className="absolute rounded-md bg-surface/90 px-1.5 py-0.5 text-[11px] text-content tabular-nums"
              style={{ left: rect.x, top: Math.max(4, rect.y - 24) }}
            >
              {label.w} × {label.h}
            </span>
          )}
          {!rect && (
            <p className="animate-rise-in absolute top-6 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-4 py-2 text-[13px] text-content shadow-lg">
              Arraste para escolher a área · clique para a tela inteira · Esc cancela
            </p>
          )}
        </>
      )}
      {phase !== 'pick' && rect && (
        <>
          <div className="capture-flash absolute inset-0 bg-content" />
          <div
            ref={flyer}
            className="capture-flyer absolute rounded-sm"
            style={{
              ...box(rect),
              backgroundImage: `url("${frame.url}")`,
              backgroundSize: `${window.innerWidth}px ${window.innerHeight}px`,
              backgroundPosition: `${-rect.x}px ${-rect.y}px`,
            }}
          />
        </>
      )}
      {phase === 'error' && (
        <p className="absolute top-6 left-1/2 -translate-x-1/2 rounded-full bg-surface px-4 py-2 text-[13px] text-danger">
          Não deu para salvar o print. Tente de novo.
        </p>
      )}
    </div>
  )
}

const box = (r: CaptureRegion) => ({ left: r.x, top: r.y, width: r.w, height: r.h })
