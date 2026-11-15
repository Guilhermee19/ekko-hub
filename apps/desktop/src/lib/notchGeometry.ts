import type { NotchSize } from './ipc/types'

// Must match crates/ekko-core/src/notch.rs (NotchSize::panel, CANVAS_PAD) and the
// `notch` rule in src-tauri display/geometry.rs.

export const PANELS: Record<NotchSize, { w: number; h: number }> = {
  compact: { w: 620, h: 440 },
  normal: { w: 740, h: 520 },
  large: { w: 880, h: 600 },
}
const CANVAS_PAD = { w: 40, h: 40 }

/** Transparent notch window size for a panel size. */
export function canvas(size: NotchSize) {
  const p = PANELS[size]
  return { w: p.w + CANVAS_PAD.w, h: p.h + CANVAS_PAD.h }
}

/** Window stays on the screen; `anchor` is the pill center inside the window. */
export function placeNotch(screenW: number, canvasW: number, offset: number) {
  const center = Math.round(screenW * Math.min(1, Math.max(0, offset)))
  const left = Math.min(screenW - canvasW, Math.max(0, center - Math.floor(canvasW / 2)))
  return { left, anchor: center - left }
}
