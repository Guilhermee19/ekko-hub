import { describe, expect, it } from 'vitest'
import { relativeTime } from './time'

const NOW = new Date(2026, 10, 15, 12, 0).getTime()
const ago = (ms: number) => NOW - ms

describe('relativeTime', () => {
  it('handles seconds, minutes and hours', () => {
    expect(relativeTime(ago(20_000), NOW)).toBe('agora')
    expect(relativeTime(ago(2 * 60_000), NOW)).toBe('há 2 min')
    expect(relativeTime(ago(3 * 3_600_000 + 5), NOW)).toBe('há 3 h')
  })

  it('handles days and falls back to a date', () => {
    expect(relativeTime(ago(26 * 3_600_000), NOW)).toBe('ontem')
    expect(relativeTime(ago(4 * 86_400_000), NOW)).toBe('há 4 dias')
    expect(relativeTime(new Date(2026, 10, 2, 9).getTime(), NOW)).toBe('02/11')
  })

  it('treats future timestamps as now', () => {
    expect(relativeTime(NOW + 5000, NOW)).toBe('agora')
  })
})
