import { describe, expect, it } from 'vitest'
import { easterSunday, seasonOf } from './season'

const on = (y: number, m: number, d: number) => seasonOf(new Date(y, m - 1, d, 15))
const iso = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

describe('season', () => {
  it('computes Easter Sunday', () => {
    expect(iso(easterSunday(2025))).toBe('2025-4-20')
    expect(iso(easterSunday(2026))).toBe('2026-4-5')
    expect(iso(easterSunday(2027))).toBe('2027-3-28')
  })

  it('Christmas, then New Year across the turn of the year', () => {
    expect(on(2026, 11, 30)).toBeNull()
    expect(on(2026, 12, 1)).toBe('christmas')
    expect(on(2026, 12, 26)).toBe('christmas')
    expect(on(2026, 12, 27)).toBe('newYear')
    expect(on(2027, 1, 2)).toBe('newYear')
    expect(on(2027, 1, 3)).toBeNull()
  })

  it('Carnival and Easter follow Easter each year', () => {
    // 2026: Easter on 5/4, Carnival Tuesday on 17/2.
    expect(on(2026, 2, 13)).toBeNull()
    expect(on(2026, 2, 14)).toBe('carnival')
    expect(on(2026, 2, 18)).toBe('carnival')
    expect(on(2026, 2, 19)).toBeNull()
    expect(on(2026, 3, 29)).toBe('easter')
    expect(on(2026, 4, 6)).toBe('easter')
    expect(on(2026, 4, 7)).toBeNull()
  })

  it('fixed-date ones', () => {
    expect(on(2026, 6, 12)).toBe('valentines')
    expect(on(2026, 6, 13)).toBeNull()
    expect(on(2026, 10, 31)).toBe('halloween')
    expect(on(2026, 10, 24)).toBeNull()
  })
})
