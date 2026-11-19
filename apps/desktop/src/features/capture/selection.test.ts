import { describe, expect, it } from 'vitest'
import { flight, isClick, rectFrom, toFrame } from './selection'

describe('capture selection', () => {
  it('builds the rect whichever way it was dragged', () => {
    expect(rectFrom({ x: 50, y: 40 }, { x: 10, y: 100 })).toEqual({ x: 10, y: 40, w: 40, h: 60 })
  })

  it('treats a tiny drag as a click', () => {
    expect(isClick({ x: 0, y: 0, w: 2, h: 300 })).toBe(true)
    expect(isClick({ x: 0, y: 0, w: 20, h: 30 })).toBe(false)
  })

  it('maps css px to frame px without gaps at 150%', () => {
    expect(toFrame({ x: 10, y: 11, w: 101, h: 33 }, 1.5)).toEqual({ x: 15, y: 17, w: 152, h: 49 })
  })

  it('flies toward the top center, shrinking wide prints', () => {
    const f = flight({ x: 0, y: 200, w: 700, h: 100 }, 1000)
    expect(f).toEqual({ dx: 150, dy: -226, scale: 0.2 })
    expect(flight({ x: 0, y: 0, w: 100, h: 100 }, 1000).scale).toBe(1)
  })
})
