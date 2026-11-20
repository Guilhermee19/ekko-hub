import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '@/lib/ipc'
import { mockEvents, mockRange } from '@/lib/ipc/integrationsMock'
import { comingUp, nextEvent, relative } from './agenda'

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

it('comingUp drops what ended and lists timed events before all-day ones', () => {
  const events = [
    ev('day', -540, 1440, true),
    ev('done', -60, 30),
    ev('later', 60, 30),
    ev('now', -10, 30),
  ]
  expect(comingUp(events, base).map((e) => e.id)).toEqual(['now', 'later', 'day'])
})

it('mock month has events on other days and keeps today in sync with the notch', () => {
  const from = new Date(2026, 10, 1).getTime()
  const to = new Date(2026, 11, 6).getTime()
  const month = mockRange(from, to, base)
  expect(month.some((e) => e.id === 'daily')).toBe(true)
  expect(month.some((e) => e.allDay && e.title === 'Pagamento')).toBe(true)
  expect(month.every((e) => e.startMs < to && e.endMs > from)).toBe(true)
})

it('mock agenda always has a meeting with a Meet link ahead', () => {
  const events = mockEvents(base)
  const daily = events.find((e) => e.id === 'daily')
  expect(daily?.meetLink).toContain('meet.google.com')
  expect(daily && daily.startMs > base).toBe(true)
})
