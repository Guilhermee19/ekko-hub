import { describe, expect, it } from 'vitest'
import { formats, fromHsv, GRID_COLUMNS, gridRows, toHsv, variations, withChannel } from './palette'

const HEX = /^#[0-9a-f]{6}$/

describe('colors palette', () => {
  it('grid has a gray row from white to black and full color rows', () => {
    const rows = gridRows()
    expect(rows).toHaveLength(10)
    for (const row of rows) {
      expect(row).toHaveLength(GRID_COLUMNS)
      for (const c of row) expect(c).toMatch(HEX)
    }
    expect(rows[0][0]).toBe('#ffffff')
    expect(rows[0][GRID_COLUMNS - 1]).toBe('#000000')
  })

  it('spectrum square: white top-left, pure hue top-right, black at the bottom', () => {
    expect(fromHsv({ h: 0, s: 0, v: 1 })).toBe('#ffffff')
    expect(fromHsv({ h: 0, s: 1, v: 1 })).toBe('#ff0000')
    expect(fromHsv({ h: 120, s: 1, v: 1 })).toBe('#00ff00')
    expect(fromHsv({ h: 240, s: 1, v: 1 })).toBe('#0000ff')
    expect(fromHsv({ h: 200, s: 0.7, v: 0 })).toBe('#000000')
    // Out of range is clamped (s, v) or wrapped (hue).
    expect(fromHsv({ h: 360, s: 2, v: 2 })).toBe('#ff0000')
  })

  it('hsv round-trips', () => {
    for (const hex of ['#3fe0c5', '#d14600', '#808080', '#5a3a6e']) {
      expect(fromHsv(toHsv(hex))).toBe(hex)
    }
    expect(toHsv('#0000ff')).toEqual({ h: 240, s: 1, v: 1 })
  })

  it('variations keep the hue and go from dark to light', () => {
    const v = variations('#3fe0c5')
    expect(v).toHaveLength(9)
    const light = v.map((c) => parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16))
    for (let i = 1; i < light.length; i++) expect(light[i]).toBeGreaterThan(light[i - 1])
    expect(variations('nope')).toEqual([])
  })

  it('replaces one channel', () => {
    expect(withChannel('#102030', 1, 255)).toBe('#10ff30')
  })

  it('formats with and without opacity', () => {
    expect(formats('#3fe0c5')).toEqual({
      hex: '#3FE0C5',
      rgb: 'rgb(63, 224, 197)',
      hsl: 'hsl(170, 72%, 56%)',
    })
    const half = formats('#3fe0c5', 50)
    expect(half.hex).toBe('#3FE0C580')
    expect(half.rgb).toBe('rgba(63, 224, 197, 0.5)')
    expect(half.hsl).toBe('hsla(170, 72%, 56%, 0.5)')
  })
})
