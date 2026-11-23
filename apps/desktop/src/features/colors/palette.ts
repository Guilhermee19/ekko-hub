import { fromHsl, parseHex, toHex, toHsl, type Rgb } from '@/theme/color'

// Pure color math for the Cores page: the grid, the spectrum, variations and the
// formats people paste. Hex is always lowercase `#rrggbb`, like the backend.

/** Grid columns, cyan around the wheel to green (the order design tools use). */
const GRID_HUES = [195, 215, 250, 275, 300, 335, 2, 20, 35, 47, 58, 95]
/** Grid rows, dark to light, under the gray row. */
const GRID_LIGHTNESS = [0.16, 0.24, 0.32, 0.41, 0.5, 0.6, 0.7, 0.8, 0.9]

export const GRID_COLUMNS = GRID_HUES.length

const hsl = (h: number, s: number, l: number) => toHex(fromHsl([h, s, l]))

/** Gray row (white → black) then one row per lightness, one column per hue. */
export function gridRows(): string[][] {
  const n = GRID_COLUMNS - 1
  const grays = GRID_HUES.map((_, i) => hsl(0, 0, 1 - i / n))
  return [grays, ...GRID_LIGHTNESS.map((l) => GRID_HUES.map((h) => hsl(h, 1, l)))]
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Hue 0..360, saturation and value 0..1: the spectrum square and its hue bar. */
export interface Hsv {
  h: number
  s: number
  v: number
}

export function fromHsv({ h, s, v }: Hsv): string {
  const [S, V] = [clamp01(s), clamp01(v)]
  const k = (n: number) => (n + (((h % 360) + 360) % 360) / 60) % 6
  const f = (n: number) => V - V * S * Math.max(0, Math.min(k(n), 4 - k(n), 1))
  return toHex([f(5) * 255, f(3) * 255, f(1) * 255])
}

export function toHsv(hex: string): Hsv {
  const rgb = parseHex(hex)
  if (!rgb) return { h: 0, s: 0, v: 0 }
  const [r, g, b] = rgb.map((c) => c / 255)
  const v = Math.max(r, g, b)
  const d = v - Math.min(r, g, b)
  const s = v === 0 ? 0 : d / v
  let h = 0
  if (d) {
    h = v === r ? ((g - b) / d) % 6 : v === g ? (b - r) / d + 2 : (r - g) / d + 4
    h = (h * 60 + 360) % 360
  }
  return { h, s, v }
}

/** Shades and tints of `hex`: same hue and saturation, dark to light. */
export function variations(hex: string, steps = 9): string[] {
  const rgb = parseHex(hex)
  if (!rgb) return []
  const [h, s] = toHsl(rgb)
  return Array.from({ length: steps }, (_, i) => hsl(h, s, 0.1 + (0.82 * i) / (steps - 1)))
}

/** `hex` with one RGB channel (0 r, 1 g, 2 b) replaced. */
export function withChannel(hex: string, channel: 0 | 1 | 2, value: number): string {
  const rgb = parseHex(hex) ?? [0, 0, 0]
  const next = [...rgb] as Rgb
  next[channel] = value
  return toHex(next)
}

export interface Formats {
  hex: string
  rgb: string
  hsl: string
}

/** Codes to copy; with opacity under 100% they carry the alpha (#rrggbbaa, rgba, hsla). */
export function formats(hex: string, opacity = 100): Formats {
  const rgb = parseHex(hex) ?? [0, 0, 0]
  const [h, s, l] = toHsl(rgb)
  const hslText = `${Math.round(h) % 360}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`
  const up = toHex(rgb).toUpperCase()
  if (opacity >= 100) {
    return { hex: up, rgb: `rgb(${rgb.join(', ')})`, hsl: `hsl(${hslText})` }
  }
  const a = Math.round(clamp01(opacity / 100) * 100) / 100
  const aa = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()
  return { hex: `${up}${aa}`, rgb: `rgba(${rgb.join(', ')}, ${a})`, hsl: `hsla(${hslText}, ${a})` }
}
