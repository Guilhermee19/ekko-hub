import { create } from 'zustand'
import { backend, type CalendarEvent, type CalendarReminder } from '@/lib/ipc'
import { errorText, useIntegrations } from '@/features/integrations/store'
import { nextEvent } from './agenda'
import { monthOf, monthRange, sameMonth, type MonthRef } from './month'

// Google Calendar in the UI. `events` is the next 24 h (notch, reminders, Início): the
// Rust poller refreshes it every 5 min and pushes `ekko://calendar/changed`; reminders
// arrive on `ekko://calendar/soon`. `monthEvents` is the month the Agenda page shows.

interface CalendarState {
  events: CalendarEvent[]
  connected: boolean
  loading: boolean
  error: string | null
  /** Last reminder pushed by the backend (the notch shows it). */
  reminder: CalendarReminder | null
  /** Month on screen in the Agenda page and everything that falls on its grid. */
  month: MonthRef
  monthEvents: CalendarEvent[]
  /** Event happening now or the next one (ignores all-day). */
  nextEvent: (now: number) => CalendarEvent | null
  /** Next 24 h plus the month on screen. */
  refresh: () => Promise<void>
  showMonth: (month: MonthRef) => Promise<void>
}

/** Months already fetched: going back and forth shows them at once, then updates. */
const cache = new Map<string, CalendarEvent[]>()
const keyOf = (m: MonthRef) => `${m.year}-${m.month}`
/** Only windows that opened the Agenda page fetch whole months. */
let monthOpened = false

export const useCalendar = create<CalendarState>((set, get) => ({
  events: [],
  connected: false,
  loading: false,
  error: null,
  reminder: null,
  month: monthOf(Date.now()),
  monthEvents: [],
  nextEvent: (now) => nextEvent(get().events, now),
  refresh: async () => {
    if (!get().connected) return
    set({ loading: true })
    try {
      set({ events: await backend.calendarUpcoming(), error: null })
    } catch (err) {
      set({ error: errorText(err) })
    } finally {
      set({ loading: false })
    }
    if (monthOpened) await get().showMonth(get().month)
  },
  showMonth: async (month) => {
    monthOpened = true
    set({ month, monthEvents: cache.get(keyOf(month)) ?? [] })
    if (!get().connected) return
    set({ loading: true })
    try {
      const events = await backend.calendarRange(...monthRange(month))
      cache.set(keyOf(month), events)
      // The user may have moved on while this month was loading.
      if (sameMonth(get().month, month)) set({ monthEvents: events, error: null })
    } catch (err) {
      if (sameMonth(get().month, month)) set({ error: errorText(err) })
    } finally {
      if (sameMonth(get().month, month)) set({ loading: false })
    }
  },
}))

// Follow the Google connection; fetch as soon as it is connected.
useIntegrations.subscribe((s, prev) => {
  const connected = s.status.google.connected
  if (connected === prev.status.google.connected) return
  if (!connected) cache.clear()
  useCalendar.setState({ connected, ...(connected ? {} : { events: [], monthEvents: [] }) })
  if (connected) void useCalendar.getState().refresh()
})

void backend.onCalendarChanged((events) => {
  useCalendar.setState({ events })
  // Something changed in the next 24 h: the month on screen is probably stale too.
  const { connected, month, showMonth } = useCalendar.getState()
  if (monthOpened && connected) void showMonth(month)
  // Another window may have connected or disconnected: resync the status.
  void useIntegrations.getState().refresh()
})
void backend.onCalendarSoon((reminder) => useCalendar.setState({ reminder }))
