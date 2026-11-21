import { fakeScreen } from './captureMock'
import {
  COLOR_PICKED,
  COLORS_CHANGED,
  type ColorBackend,
  type ColorHistory,
  type PickedColor,
} from './colorTypes'
import type { Unlisten } from './types'

// Browser gallery: the eyedropper reads the drawn fake desktop for real (painted on a
// canvas), and the history lives in memory, seeded with a few picks.

interface Bus {
  on: (event: string, cb: (payload: unknown) => void) => Promise<Unlisten>
  fire: (event: string, payload: unknown) => void
}

const R = 5

const hex2 = (n: number) => n.toString(16).padStart(2, '0')

/** Same formats as ekko-core/colors.rs. */
export function describe(r: number, g: number, b: number, at = Date.now()): PickedColor {
  const [rf, gf, bf] = [r / 255, g / 255, b / 255]
  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1))
    h =
      max === rf
        ? 60 * ((((gf - bf) / d) % 6) + 6)
        : max === gf
          ? 60 * ((bf - rf) / d + 2)
          : 60 * ((rf - gf) / d + 4)
  }
  return {
    hex: `#${hex2(r)}${hex2(g)}${hex2(b)}`,
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${Math.round(h) % 360}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
    at,
  }
}

let pixels: Promise<ImageData> | null = null

/** The fake desktop as pixels (an SVG data URL never taints the canvas). */
function screen(): Promise<ImageData> {
  pixels ??= new Promise((resolve, reject) => {
    const f = fakeScreen()
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = f.width
      c.height = f.height
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('sem canvas'))
      ctx.drawImage(img, 0, 0, f.width, f.height)
      resolve(ctx.getImageData(0, 0, f.width, f.height))
    }
    img.onerror = reject
    img.src = f.url
  })
  return pixels
}

const at = (data: ImageData, x: number, y: number): [number, number, number] | null => {
  if (x < 0 || y < 0 || x >= data.width || y >= data.height) return null
  const i = (y * data.width + x) * 4
  return [data.data[i], data.data[i + 1], data.data[i + 2]]
}

export function mockColor({ on, fire }: Bus): ColorBackend {
  let history: ColorHistory = {
    colors: [
      describe(56, 189, 248, Date.now() - 60_000),
      describe(244, 244, 245, Date.now() - 120_000),
      describe(90, 58, 110, Date.now() - 180_000),
    ],
  }
  const change = (next: ColorHistory) => {
    history = next
    fire(COLORS_CHANGED, history)
    return Promise.resolve(history)
  }
  return {
    colorStart: () => Promise.resolve(),
    colorLoupe: async (x, y) => {
      const data = await screen()
      const out: (string | null)[] = []
      for (let yy = y - R; yy <= y + R; yy++)
        for (let xx = x - R; xx <= x + R; xx++) {
          const p = at(data, xx, yy)
          out.push(p && describe(...p).hex)
        }
      return out
    },
    colorPick: async (x, y) => {
      const p = at(await screen(), x, y)
      if (!p) throw new Error('nenhuma cor sob o cursor')
      const color = describe(...p)
      await change({
        colors: [color, ...history.colors.filter((c) => c.hex !== color.hex)].slice(0, 16),
      })
      fire(COLOR_PICKED, color)
      return color
    },
    colorCopy: (text) => navigator.clipboard?.writeText(text) ?? Promise.resolve(),
    colorHistory: () => Promise.resolve(history),
    colorRemove: (hex) => change({ colors: history.colors.filter((c) => c.hex !== hex) }),
    colorClear: () => change({ colors: [] }),
    onColorPicked: (cb) => on(COLOR_PICKED, (c) => cb(c as PickedColor)),
    onColorsChanged: (cb) => on(COLORS_CHANGED, (h) => cb(h as ColorHistory)),
  }
}
