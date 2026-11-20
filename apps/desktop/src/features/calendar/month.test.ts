import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '@/lib/ipc'
import { eventsOn, monthDays, monthLabel, monthRange, shiftMonth, startOfDay } from './month'

const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m, d, h, min).getTime()

const ev = (id: string, startMs: number, endMs: number, allDay = false): CalendarEvent => ({
  id,
  title: id,
  startMs,
  endMs,
  allDay,
  location: null,
  meetLink: null,
  calendarName: 'Agenda',
})

describe('monthDays', () => {
  it('starts on the Sunday before the 1st and fills whole weeks', () => {
    // November 2026 starts on a Sunday and has 30 days: 5 rows.
    const nov = monthDays({ year: 2026, month: 10 })
    expect(nov).toHaveLength(35)
    expect(nov[0]).toBe(at(2026, 10, 1))
    expect(nov[34]).toBe(at(2026, 11, 5))
    // February 2026 starts on a Sunday with 28 days: exactly 4 rows.
    expect(monthDays({ year: 2026, month: 1 })).toHaveLength(28)
    // August 2026 starts on a Saturday with 31 days: 6 rows.
    const aug = monthDays({ year: 2026, month: 7 })
    expect(aug).toHaveLength(42)
    expect(aug[0]).toBe(at(2026, 6, 26))
  })

  it('gives the range that covers every day on screen', () => {
    expect(monthRange({ year: 2026, month: 10 })).toEqual([at(2026, 10, 1), at(2026, 11, 6)])
  })
})

it('shiftMonth crosses the year', () => {
  expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
  expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
})

describe('eventsOn', () => {
  const day = at(2026, 10, 20)
  it('puts all-day first, then by time, and skips other days', () => {
    const events = [
      ev('late', at(2026, 10, 20, 18), at(2026, 10, 20, 19)),
      ev('early', at(2026, 10, 20, 9), at(2026, 10, 20, 10)),
      // Google ends all-day events at the next midnight (exclusive).
      ev('allday', day, at(2026, 10, 21), true),
      ev('yesterday', at(2026, 10, 19, 9), at(2026, 10, 19, 10)),
      ev('tomorrow', at(2026, 10, 21, 9), at(2026, 10, 21, 10)),
    ]
    expect(eventsOn(events, day).map((e) => e.id)).toEqual(['allday', 'early', 'late'])
    expect(eventsOn(events, at(2026, 10, 21)).map((e) => e.id)).toEqual(['tomorrow'])
  })

  it('shows multi-day events on every day and keeps zero-length ones', () => {
    const trip = ev('trip', at(2026, 10, 19, 22), at(2026, 10, 21, 8))
    const ping = ev('ping', at(2026, 10, 20, 0), at(2026, 10, 20, 0))
    for (const d of [19, 20, 21]) {
      expect(eventsOn([trip], at(2026, 10, d)).map((e) => e.id)).toEqual(['trip'])
    }
    expect(eventsOn([trip], at(2026, 10, 22))).toEqual([])
    expect(eventsOn([ping], day).map((e) => e.id)).toEqual(['ping'])
  })
})

it('labels and day starts are local', () => {
  expect(monthLabel({ year: 2026, month: 10 })).toBe('Novembro de 2026')
  expect(startOfDay(at(2026, 10, 20, 15, 30))).toBe(at(2026, 10, 20))
})
