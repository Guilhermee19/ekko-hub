import { describe, expect, it } from 'vitest'
import { formatTime } from './time'

describe('formatTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(272)).toBe('4:32')
  })

  it('adds hours past 60 minutes and truncates fractions', () => {
    expect(formatTime(3725.9)).toBe('1:02:05')
  })

  it('clamps invalid input', () => {
    expect(formatTime(-3)).toBe('0:00')
    expect(formatTime(Number.NaN)).toBe('0:00')
  })
})
