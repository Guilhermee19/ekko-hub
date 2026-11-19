// Small sRGB helpers for the appearance settings (custom accent, tones, contrast).

export type Rgb = [number, number, number]

const HEX = /^#?([0-9a-f]{6})$/i

/** `#rrggbb` (or without `#`) → normalized `#rrggbb`; null when invalid. */
export function normalizeHex(raw: string): string | null {
  const m = HEX.exec(raw.trim())
  return m ? `#${m[1].toLowerCase()}` : null
}

export function parseHex(hex: string): Rgb | null {
  const n = normalizeHex(hex)
  if (!n) return null
  const v = parseInt(n.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export function toHex([r, g, b]: Rgb): string {
  const c = (x: number) =>
    Math.round(Math.min(255, Math.max(0, x)))
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Linear mix in sRGB: `amount` of `b` into `a` (0 = a, 1 = b). */
export function mix(a: string, b: string, amount: number): string {
  const x = parseHex(a)
  const y = parseHex(b)
  if (!x || !y) return a
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as Rgb)
}

function toHsl([r, g, b]: Rgb): Rgb {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4
  return [h * 60, s, l]
}

function fromHsl([h, s, l]: Rgb): Rgb {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

/**
 * Neighbor hue for the notch aura: cool accents lean violet, warm ones lean rose (the
 * blue→purple light of the reference notch, still derived from the accent).
 */
export function auraPartner(hex: string): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const [h, s, l] = toHsl(rgb)
  const turn = h >= 150 && h < 300 ? 65 : -65
  return toHex(fromHsl([(h + turn + 360) % 360, s, l]))
}

/**
 * Deeper, slightly more saturated tone of `hex` (how the personas pair accent and
 * accent-strong). `amount` 0..1 is the share of lightness removed.
 */
export function darken(hex: string, amount = 0.45): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const [h, s, l] = toHsl(rgb)
  return toHex(fromHsl([h, Math.min(1, s * 1.1), l * (1 - amount)]))
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1..21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Accent is used for icons, borders and small labels: WCAG asks 3:1 for UI parts. */
export const MIN_ACCENT_CONTRAST = 3
