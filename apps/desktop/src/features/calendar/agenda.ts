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

/**
 * What the Início card lists: what is happening or still to come, timed events first
 * (they have an hour to catch), all-day ones after.
 */
export function comingUp(events: CalendarEvent[], now: number): CalendarEvent[] {
  return events
    .filter((e) => e.endMs > now)
    .sort((a, b) => Number(a.allDay) - Number(b.allDay) || a.startMs - b.startMs)
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
