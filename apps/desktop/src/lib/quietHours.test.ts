import { describe, expect, it } from 'vitest'
import { dndActive, parseHhmm } from './quietHours'

const at = (h: number, m = 0) => new Date(2026, 10, 15, h, m)
const dnd = (from: string, to: string, enabled = true) => ({ enabled, from, to })

describe('quiet hours', () => {
  it('parses HH:MM', () => {
    expect(parseHhmm('07:30')).toBe(450)
    expect(parseHhmm('24:00')).toBeNull()
    expect(parseHhmm('oops')).toBeNull()
  })

  it('handles a same-day window', () => {
    expect(dndActive(dnd('13:00', '14:00'), at(13, 30))).toBe(true)
    expect(dndActive(dnd('13:00', '14:00'), at(14))).toBe(false)
  })

  it('crosses midnight', () => {
    const night = dnd('22:00', '07:00')
    expect(dndActive(night, at(23))).toBe(true)
    expect(dndActive(night, at(3))).toBe(true)
    expect(dndActive(night, at(7))).toBe(false)
    expect(dndActive(night, at(12))).toBe(false)
  })

  it('is off when disabled, empty or malformed', () => {
    expect(dndActive(dnd('22:00', '07:00', false), at(23))).toBe(false)
    expect(dndActive(dnd('08:00', '08:00'), at(8))).toBe(false)
    expect(dndActive(dnd('bad', '07:00'), at(3))).toBe(false)
  })
})
