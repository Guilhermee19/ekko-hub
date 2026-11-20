import type { CalendarEvent } from '@/lib/ipc'

// Pure month-view helpers (tested): which days a month shows and what falls on each.

export interface MonthRef {
  year: number
  /** 0 = January. */
  month: number
}

/** Sunday first, as Brazilian calendars are printed. */
export const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

export function monthOf(ms: number): MonthRef {
  const d = new Date(ms)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  return monthOf(new Date(ref.year, ref.month + delta, 1).getTime())
}

export const sameMonth = (a: MonthRef, b: MonthRef) => a.year === b.year && a.month === b.month

/** Local midnight of the day `ms` falls on. */
export function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Local midnights of every day the month view shows: whole weeks from the Sunday on or
 * before the 1st, as many rows as the month needs (4 to 6).
 */
export function monthDays({ year, month }: MonthRef): number[] {
  const lead = new Date(year, month, 1).getDay()
  const inMonth = new Date(year, month + 1, 0).getDate()
  const cells = Math.ceil((lead + inMonth) / 7) * 7
  // Built from calendar fields, not by adding 24 h: daylight saving days are not 24 h.
  return Array.from({ length: cells }, (_, i) => new Date(year, month, 1 - lead + i).getTime())
}

/** [from, to) covering every day on screen, to ask the backend for. */
export function monthRange(ref: MonthRef): [number, number] {
  const days = monthDays(ref)
  const last = new Date(days[days.length - 1] ?? 0)
  last.setDate(last.getDate() + 1)
  return [days[0] ?? 0, last.getTime()]
}

/** All-day first, then by start time. */
function byDayOrder(a: CalendarEvent, b: CalendarEvent): number {
  return Number(b.allDay) - Number(a.allDay) || a.startMs - b.startMs || a.endMs - b.endMs
}

/** Events touching the day that starts at `day` (multi-day ones show on every day). */
export function eventsOn(events: CalendarEvent[], day: number): CalendarEvent[] {
  const next = new Date(day)
  next.setDate(next.getDate() + 1)
  const end = next.getTime()
  return events
    .filter((e) => e.startMs < end && (e.endMs > day || e.startMs >= day))
    .sort(byDayOrder)
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Novembro de 2026". */
export function monthLabel({ year, month }: MonthRef): string {
  return cap(
    new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  )
}

/** "Sexta-feira, 20 de novembro". */
export function dayLabel(day: number): string {
  return cap(
    new Date(day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
  )
}
