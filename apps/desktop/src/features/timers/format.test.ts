import { describe, expect, it } from 'vitest'
import { elapsedFraction, formatDuration, formatElapsed, remainingMs } from './format'

describe('timer format', () => {
  it('formats stopwatch readings', () => {
    expect(formatElapsed(0)).toBe('00:00.0')
    expect(formatElapsed(83_456)).toBe('01:23.4')
    expect(formatElapsed(3_723_900)).toBe('1:02:03.9')
  })

  it('formats durations', () => {
    expect(formatDuration(30)).toBe('30 s')
    expect(formatDuration(300)).toBe('5 min')
    expect(formatDuration(5400)).toBe('1 h 30 min')
    expect(formatDuration(7200)).toBe('2 h')
  })

  it('clamps remaining time and prefers the paused value', () => {
    expect(remainingMs(10_000, 60, 0)).toBe(10_000)
    expect(remainingMs(10_000, 60, 20_000)).toBe(0)
    expect(remainingMs(500_000, 60, 0)).toBe(60_000)
    expect(remainingMs(10_000, 60, 0, 42_000)).toBe(42_000)
  })

  it('computes elapsed fraction', () => {
    expect(elapsedFraction(30_000, 60)).toBe(0.5)
    expect(elapsedFraction(0, 0)).toBe(1)
  })
})
