import type { Unlisten } from './types'

// Mirrors services/colors.rs + commands/colors.rs (ekko-core/colors.rs for the data).

export const COLOR_PICKED = 'ekko://color/picked'
export const COLORS_CHANGED = 'ekko://colors/changed'

/** One picked color in the formats people paste. */
export interface PickedColor {
  /** "#3fe0c5" */
  hex: string
  /** "rgb(63, 224, 197)" */
  rgb: string
  /** "hsl(170, 72%, 56%)" */
  hsl: string
  /** Unix ms. */
  at: number
}

/** Last picks, newest first (up to 16). */
export interface ColorHistory {
  colors: PickedColor[]
}

export interface ColorBackend {
  /** Freezes the screen and opens the eyedropper. */
  colorStart(): Promise<void>
  /** Hex of the 11×11 pixels around (x, y) of the frozen frame; null off the screen. */
  colorLoupe(x: number, y: number): Promise<(string | null)[]>
  /** Takes the color at (x, y), closes the eyedropper and saves it in the history. */
  colorPick(x: number, y: number): Promise<PickedColor>
  colorCopy(text: string): Promise<void>
  colorHistory(): Promise<ColorHistory>
  /** Keeps a `#rrggbb` chosen on the Cores page in the history (front, deduped). */
  colorSave(hex: string): Promise<ColorHistory>
  colorRemove(hex: string): Promise<ColorHistory>
  colorClear(): Promise<ColorHistory>
  onColorPicked(cb: (c: PickedColor) => void): Promise<Unlisten>
  onColorsChanged(cb: (h: ColorHistory) => void): Promise<Unlisten>
}
