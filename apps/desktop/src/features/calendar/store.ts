import { create } from 'zustand'
import { backend, type CalendarEvent, type CalendarReminder } from '@/lib/ipc'
import { errorText, useIntegrations } from '@/features/integrations/store'
import { nextEvent } from './agenda'

// Upcoming Google Calendar events (next 24 h). The Rust poller refreshes every 5 min
// and pushes `ekko://calendar/changed`; reminders arrive on `ekko://calendar/soon`.

interface CalendarState {
  events: CalendarEvent[]
  connected: boolean
  loading: boolean
  error: string | null
  /** Last reminder pushed by the backend (the notch shows it). */
  reminder: CalendarReminder | null
  /** Event happening now or the next one (ignores all-day). */
  nextEvent: (now: number) => CalendarEvent | null
  refresh: () => Promise<void>
}

export const useCalendar = create<CalendarState>((set, get) => ({
  events: [],
  connected: false,
  loading: false,
  error: null,
  reminder: null,
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
  },
}))

// Follow the Google connection; fetch as soon as it is connected.
useIntegrations.subscribe((s, prev) => {
  const connected = s.status.google.connected
  if (connected === prev.status.google.connected) return
  useCalendar.setState({ connected, ...(connected ? {} : { events: [] }) })
  if (connected) void useCalendar.getState().refresh()
})

void backend.onCalendarChanged((events) => {
  useCalendar.setState({ events })
  // Another window may have connected or disconnected: resync the status.
  void useIntegrations.getState().refresh()
})
void backend.onCalendarSoon((reminder) => useCalendar.setState({ reminder }))
