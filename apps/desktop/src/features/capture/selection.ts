import type { CaptureRegion } from '@/lib/ipc'

export interface Point {
  x: number
  y: number
}

/** Below this (css px) a press counts as a click: the whole screen is taken. */
export const MIN_SIDE = 4

/** Rectangle between the press and the pointer, whichever way it was dragged. */
export function rectFrom(a: Point, b: Point): CaptureRegion {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  }
}

export const isClick = (r: CaptureRegion) => r.w < MIN_SIDE || r.h < MIN_SIDE

/** Css px of the overlay → frame px (the frame is the monitor in physical pixels). */
export function toFrame(r: CaptureRegion, scale: number): CaptureRegion {
  const x = Math.round(r.x * scale)
  const y = Math.round(r.y * scale)
  return {
    x,
    y,
    w: Math.round((r.x + r.w) * scale) - x,
    h: Math.round((r.y + r.h) * scale) - y,
  }
}

/** Where the saved print flies to: shrunk toward the notch at the top center. */
export function flight(r: CaptureRegion, viewW: number) {
  const scale = Math.min(1, 140 / Math.max(r.w, 1))
  return {
    dx: viewW / 2 - (r.x + r.w / 2),
    dy: 24 - (r.y + r.h / 2),
    scale,
  }
}
