import type { CalendarEvent } from '@/lib/ipc'

// Pure agenda helpers (tested): what's next, today's slice, labels.

const MIN = 60_000

/** The event happening now or the next one to start (all-day events are ignored). */
export function nextEvent(events: CalendarEvent[], now: number): CalendarEvent | null {
  return (
    events.filter((e) => !e.allDay && e.endMs > now).sort((a, b) => a.startMs - b.startMs)[0] ??
    null
  )
}

export function isOngoing(e: CalendarEvent, now: number): boolean {
  return e.startMs <= now && now < e.endMs
}

function endOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}

/** Splits into today (still relevant) and later (tomorrow, inside the 24 h window). */
export function splitByDay(events: CalendarEvent[], now: number) {
  const midnight = endOfDay(now)
  const live = events.filter((e) => e.endMs > now)
  return {
    allDay: live.filter((e) => e.allDay && e.startMs < midnight),
    today: live.filter((e) => !e.allDay && e.startMs < midnight),
    later: live.filter((e) => !e.allDay && e.startMs >= midnight),
  }
}

export function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** "agora", "em 5 min", "em 1 h 20 min", "às 16:00". */
export function relative(e: CalendarEvent, now: number): string {
  if (isOngoing(e, now)) return 'agora'
  const mins = Math.ceil((e.startMs - now) / MIN)
  if (mins < 60) return `em ${mins} min`
  if (mins < 180) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `em ${h} h ${m} min` : `em ${h} h`
  }
  return `às ${clock(e.startMs)}`
}

/** Position of `ms` on a day timeline from `fromHour` to `toHour`, 0..1 (clamped). */
export function dayFraction(ms: number, fromHour: number, toHour: number): number {
  const d = new Date(ms)
  const hours = d.getHours() + d.getMinutes() / 60
  return Math.min(1, Math.max(0, (hours - fromHour) / (toHour - fromHour)))
}
