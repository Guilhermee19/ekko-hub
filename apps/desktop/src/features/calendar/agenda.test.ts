import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '@/lib/ipc'
import { mockEvents } from '@/lib/ipc/integrationsMock'
import { dayFraction, nextEvent, relative, splitByDay } from './agenda'

const MIN = 60_000
const base = new Date(2026, 10, 15, 9, 0).getTime()

const ev = (id: string, startMin: number, minutes: number, allDay = false): CalendarEvent => ({
  id,
  title: id,
  startMs: base + startMin * MIN,
  endMs: base + (startMin + minutes) * MIN,
  allDay,
  location: null,
  meetLink: null,
  calendarName: 'Agenda',
})

describe('nextEvent', () => {
  it('prefers the ongoing event, skips all-day and finished ones', () => {
    const events = [
      ev('day', -540, 1440, true),
      ev('done', -60, 30),
      ev('now', -10, 30),
      ev('later', 60, 30),
    ]
    expect(nextEvent(events, base)?.id).toBe('now')
    expect(nextEvent(events, base + 25 * MIN)?.id).toBe('later')
    expect(nextEvent([], base)).toBeNull()
  })
})

describe('relative', () => {
  it('formats minutes, hours and clock times', () => {
    expect(relative(ev('a', -5, 30), base)).toBe('agora')
    expect(relative(ev('a', 5, 30), base)).toBe('em 5 min')
    expect(relative(ev('a', 80, 30), base)).toBe('em 1 h 20 min')
    expect(relative(ev('a', 120, 30), base)).toBe('em 2 h')
    expect(relative(ev('a', 240, 30), base)).toMatch(/^às 13:00$/)
  })
})

describe('splitByDay', () => {
  it('separates all-day, today and tomorrow', () => {
    const events = [ev('day', -540, 1440, true), ev('today', 60, 30), ev('tomorrow', 16 * 60, 30)]
    const { allDay, today, later } = splitByDay(events, base)
    expect([allDay, today, later].map((l) => l.map((e) => e.id))).toEqual([
      ['day'],
      ['today'],
      ['tomorrow'],
    ])
  })
})

it('dayFraction clamps to the timeline', () => {
  expect(dayFraction(base, 7, 23)).toBeCloseTo(2 / 16)
  expect(dayFraction(base - 8 * 60 * MIN, 7, 23)).toBe(0)
})

it('mock agenda always has a meeting with a Meet link ahead', () => {
  const events = mockEvents(base)
  const daily = events.find((e) => e.id === 'daily')
  expect(daily?.meetLink).toContain('meet.google.com')
  expect(daily && daily.startMs > base).toBe(true)
})
