import { useCalendar } from '@/features/calendar/store'
import { useMusic } from '@/features/music/store'
import type { CalendarEvent } from '@/lib/ipc'
import { useNow } from '@/surfaces/shared/useNow'
import {
  phaseSeconds,
  POMO_LABEL,
  useTimers,
  type Pomodoro,
  type Timer,
} from '@/features/timers/store'
import { useAssistant, type Activity, type Presence } from './assistant'
import { useSettings } from './settings'

// What the notch pill shows when Ekko is idle: derived live from the real sources
// (timers, calendar, now playing) instead of being pushed by each feature.

export type LiveKind = 'timer' | 'event' | 'music'

export const DEFAULT_PRIORITY: LiveKind[] = ['timer', 'event', 'music']

export interface LiveSources {
  timers: Timer[]
  pomodoro: Pomodoro
  music: { title: string; artist: string; playing: boolean } | null
  event: Extract<Activity, { kind: 'event' }> | null
}

/** Pure pick: first source in `priority` that has something, skipping hidden kinds. */
export function pickActivity(
  src: LiveSources,
  priority: LiveKind[] = DEFAULT_PRIORITY,
  hidden: Partial<Record<LiveKind, boolean>> = {},
): Activity | null {
  for (const kind of priority) {
    if (hidden[kind]) continue
    const a = candidate(kind, src)
    if (a) return a
  }
  return null
}

function candidate(kind: LiveKind, src: LiveSources): Activity | null {
  if (kind === 'timer') {
    const running = src.timers
      .filter((t) => t.pausedLeft === undefined)
      .sort((a, b) => a.endsAt - b.endsAt)[0]
    if (running)
      return { kind: 'timer', label: running.label, endsAt: running.endsAt, total: running.total }
    const p = src.pomodoro
    if (p.endsAt !== null)
      return { kind: 'timer', label: POMO_LABEL[p.phase], endsAt: p.endsAt, total: phaseSeconds(p) }
    return null
  }
  if (kind === 'event') return src.event
  // Music only while something is actually playing; a paused player stays quiet.
  return src.music?.playing ? { kind: 'music', ...src.music } : null
}

/** Minutes before an event when the pill starts announcing it. */
export const EVENT_LEAD_MIN = 15

/** Ongoing timed event, or the next one starting within the lead window. */
export function eventActivity(
  events: CalendarEvent[],
  now: number,
  leadMin = EVENT_LEAD_MIN,
): Extract<Activity, { kind: 'event' }> | null {
  const e = events
    .filter((e) => !e.allDay && e.endMs > now && e.startMs - now <= leadMin * 60_000)
    .sort((a, b) => a.startMs - b.startMs)[0]
  if (!e) return null
  return {
    kind: 'event',
    title: e.title,
    startsAt: e.startMs,
    endsAt: e.endMs,
    meetLink: e.meetLink ?? undefined,
  }
}

/** Presence with `activity` filled from live sources (an explicit activity, e.g. volume, wins). */
export function usePresence(): Presence {
  const presence = useAssistant()
  const timers = useTimers((s) => s.timers)
  const pomodoro = useTimers((s) => s.pomodoro)
  const track = useMusic((s) => s.track)
  const playing = useMusic((s) => s.playing)
  const events = useCalendar((s) => s.events)
  const { pillPriority, pillShow } = useSettings((s) => s.settings.appearance)
  // Re-check every 30 s so an event appears when it enters the lead window.
  const now = useNow(events.length > 0, 30_000)
  if (presence.activity) return presence
  const music = track ? { title: track.title, artist: track.artist, playing } : null
  const event = eventActivity(events, now)
  const hidden = { timer: !pillShow.timer, event: !pillShow.event, music: !pillShow.music }
  const activity = pickActivity({ timers, pomodoro, music, event }, pillPriority, hidden)
  return { ...presence, activity }
}
