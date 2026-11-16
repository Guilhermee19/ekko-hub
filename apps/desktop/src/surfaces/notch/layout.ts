import type { NotchIdle, NotchSize } from '@/lib/ipc'
import { canvas, PANELS } from '@/lib/notchGeometry'
import type { Presence } from '@/stores/assistant'

export { canvas }

export const PILL_H = 38
/** Minimal idle style: a thin bar drawn inside a slightly bigger box, easy to reach. */
export const MINIMAL = { w: 120, h: 12, bar: { w: 96, h: 5 } } as const

/** Nothing worth showing in the pill: the minimal style can shrink to a line. */
export function isQuiet(p: Presence): boolean {
  return p.phase === 'idle' && !p.toast && !p.activity
}

/** Pill width per state: wide enough for its content, narrow when idle (Kobi-like). */
export function pillWidth(p: Presence): number {
  if (p.phase === 'listening' || p.phase === 'speaking') return 400
  if (p.phase === 'thinking') return 260
  if (p.toast) return 420
  switch (p.activity?.kind) {
    case 'music':
      return 320
    case 'event':
      return 300
    case 'timer':
      return 220
    case 'volume':
      return 240
    default:
      return 150
  }
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export type NotchLook = 'panel' | 'pill' | 'line'

export function notchLook(expanded: boolean, idle: NotchIdle, p: Presence): NotchLook {
  if (expanded) return 'panel'
  return idle === 'minimal' && isQuiet(p) ? 'line' : 'pill'
}

/**
 * Notch box inside the canvas, centered on `anchor` (pill center sent by the backend;
 * canvas center by default) but never cut by the canvas edge. Also the mouse hit area.
 */
export function notchBox(
  look: NotchLook,
  size: NotchSize,
  p: Presence,
  anchor?: number,
  /** Pill size multiplier from the appearance settings (pill only). */
  pillScale = 1,
  /** Extra pill width for optional bits (the clock). */
  extraW = 0,
): Box {
  const { w: cw } = canvas(size)
  const [w, h] =
    look === 'panel'
      ? [PANELS[size].w, PANELS[size].h]
      : look === 'line'
        ? [MINIMAL.w, MINIMAL.h]
        : [Math.round((pillWidth(p) + extraW) * pillScale), Math.round(PILL_H * pillScale)]
  const center = anchor ?? cw / 2
  const x = Math.min(cw - w, Math.max(0, Math.round(center - w / 2)))
  return { x, y: 0, w, h }
}

/** Room the optional HH:MM clock needs in the pill. */
export const CLOCK_W = 48

// Kept here for older imports; lives in lib/time.
export { formatRemaining } from '@/lib/time'
