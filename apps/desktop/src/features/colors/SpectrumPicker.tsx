import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { fromHsv, toHsv } from './palette'

interface Props {
  value: string
  onChange: (hex: string) => void
}

/** Arrow keys move 2% (Shift 10%); on the hue bar that is ~7° (Shift ~36°). */
const STEP = 0.02

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Pointer position inside the element, 0..1 on each axis. */
function fraction(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) }
}

/** Arrow keys as a (dx, dy) nudge; null for other keys. */
function nudge(e: KeyboardEvent<HTMLElement>): [number, number] | null {
  const step = (e.shiftKey ? 5 : 1) * STEP
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }
  return moves[e.key] ?? null
}

/** Drag handlers: press picks, moving with the button down keeps picking. */
function dragging(pick: (e: PointerEvent<HTMLDivElement>) => void) {
  return {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      pick(e)
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => e.buttons === 1 && pick(e),
  }
}

const MARKER =
  'pointer-events-none absolute size-4 -translate-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.45)]'

/**
 * Saturation × brightness square in the current hue, with the hue bar under it. The
 * hue lives in state so grays and black (which have none) keep the bar where it was.
 */
export function SpectrumPicker({ value, onChange }: Props) {
  const hsv = toHsv(value)
  const [hue, setHue] = useState(hsv.h)
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    // Color changed elsewhere (grid, sliders, saved): follow its hue when it has one.
    setSeen(value)
    if (hsv.s > 0 && hsv.v > 0) setHue(hsv.h)
  }

  const setSv = (s: number, v: number) => onChange(fromHsv({ h: hue, s, v }))
  const setH = (h: number) => {
    setHue(h)
    onChange(fromHsv({ h, s: hsv.s, v: hsv.v }))
  }
  const pure = fromHsv({ h: hue, s: 1, v: 1 })

  return (
    <div className="flex flex-col gap-3">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Saturação na horizontal, brilho na vertical"
        aria-valuetext={value.toUpperCase()}
        {...dragging((e) => {
          const p = fraction(e)
          setSv(p.x, 1 - p.y)
        })}
        onKeyDown={(e) => {
          const d = nudge(e)
          if (!d) return
          e.preventDefault()
          setSv(clamp01(hsv.s + d[0]), clamp01(hsv.v - d[1]))
        }}
        className="relative aspect-4/3 w-full cursor-crosshair touch-none rounded-lg border border-border-soft focus-visible:outline-2 focus-visible:outline-accent"
        style={{
          background: `linear-gradient(to top, #000, rgb(0 0 0 / 0)), linear-gradient(to right, #fff, ${pure})`,
        }}
      >
        <span
          aria-hidden
          className={MARKER}
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: value }}
        />
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Matiz"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hue)}
        {...dragging((e) => setH(fraction(e).x * 360))}
        onKeyDown={(e) => {
          const d = nudge(e)
          if (!d || !d[0]) return
          e.preventDefault()
          setH(clamp01(hue / 360 + d[0] * 1.8) * 360)
        }}
        className="relative h-6 w-full cursor-pointer touch-none rounded-lg focus-visible:outline-2 focus-visible:outline-accent"
        style={{
          background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}
      >
        <span
          aria-hidden
          className={`${MARKER} top-1/2`}
          style={{ left: `${(hue / 360) * 100}%`, background: pure }}
        />
      </div>
    </div>
  )
}
