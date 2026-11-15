import { describe, expect, it } from 'vitest'
import { METRIC_SPECS, metricAt, metricSeries, noise, sparkPoints, type MetricKey } from './metrics'

const KEYS = Object.keys(METRIC_SPECS) as MetricKey[]

describe('mock metrics', () => {
  it('noise is deterministic and bounded', () => {
    for (let i = 0; i < 500; i++) {
      const n = noise(3, i)
      expect(n).toBe(noise(3, i))
      expect(n).toBeGreaterThanOrEqual(-1)
      expect(n).toBeLessThanOrEqual(1)
    }
  })

  it('values stay within each spec range', () => {
    for (const key of KEYS) {
      const { min, max } = METRIC_SPECS[key]
      for (let sec = 1_700_000_000; sec < 1_700_000_600; sec++) {
        const v = metricAt(key, sec)
        expect(v).toBeGreaterThanOrEqual(min)
        expect(v).toBeLessThanOrEqual(max)
      }
    }
  })

  it('series is a sliding window over time', () => {
    const now = 1_700_000_123_456
    const a = metricSeries('cpu', now, 30)
    const b = metricSeries('cpu', now + 1000, 30)
    expect(a).toHaveLength(30)
    expect(b.slice(0, 29)).toEqual(a.slice(1))
    expect(metricSeries('cpu', now + 400, 30)).toEqual(a)
  })

  it('sparkPoints maps the domain to the box (y grows downward)', () => {
    expect(sparkPoints([0, 50, 100], 100, 20, 0, 100)).toBe('0.0,20.0 50.0,10.0 100.0,0.0')
    expect(sparkPoints([], 100, 20, 0, 100)).toBe('')
  })
})
