import { describe, expect, it } from 'vitest'
import { dayAt, endOfDay, formatDue, isDueToday } from './due'

// Sunday 15 Nov 2026, 10:00 local time.
const NOW = new Date(2026, 10, 15, 10, 0).getTime()

describe('formatDue', () => {
  it('marks past dates as overdue', () => {
    expect(formatDue(NOW - 60_000, NOW)).toEqual({ text: 'atrasada', overdue: true })
  })

  it('shows today and tomorrow with time', () => {
    expect(formatDue(dayAt(NOW, 15), NOW).text).toBe('hoje 15:00')
    expect(formatDue(dayAt(NOW, 9, 30, 1), NOW).text).toBe('amanhã 09:30')
  })

  it('omits the time for end-of-day dues', () => {
    expect(formatDue(endOfDay(NOW), NOW).text).toBe('hoje')
  })

  it('uses the weekday within a week and the date beyond', () => {
    expect(formatDue(dayAt(NOW, 8, 0, 3), NOW).text).toBe('qua 08:00')
    expect(formatDue(dayAt(NOW, 8, 0, 10), NOW).text).toBe('25/11')
  })
})

describe('isDueToday', () => {
  it('includes overdue and today, excludes tomorrow', () => {
    expect(isDueToday(NOW - 3 * 86_400_000, NOW)).toBe(true)
    expect(isDueToday(endOfDay(NOW), NOW)).toBe(true)
    expect(isDueToday(dayAt(NOW, 0, 0, 1), NOW)).toBe(false)
    expect(isDueToday(undefined, NOW)).toBe(false)
  })
})
