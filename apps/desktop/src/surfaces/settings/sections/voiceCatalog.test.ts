import { describe, expect, it } from 'vitest'
import { litBars, mockMicLevel } from './voiceCatalog'

describe('mock mic meter', () => {
  it('always yields a level between 0 and 1', () => {
    for (let t = 0; t < 20_000; t += 37) {
      const v = mockMicLevel(t)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('maps levels to lit bars', () => {
    expect(litBars(0, 20)).toBe(0)
    expect(litBars(0.5, 20)).toBe(10)
    expect(litBars(2, 20)).toBe(20)
    expect(litBars(-1, 20)).toBe(0)
  })
})
