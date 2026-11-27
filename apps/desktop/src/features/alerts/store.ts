import { create } from 'zustand'
import { snoozeMs } from '@/features/notifications/AlarmOverlay'
import { backend, type MailMessage, type PickedColor } from '@/lib/ipc'

// Alerts the notch grows into for a few seconds (a new song, a timer going off, a
// meeting soon, low battery…), one at a time. Only the notch window renders them; it
// flips `live` on, so other windows keep their old text toast instead.

export type AlertKind =
  'music' | 'timer' | 'reminder' | 'event' | 'battery' | 'device' | 'notice' | 'color' | 'email'

export interface Alert {
  id: string
  kind: AlertKind
  /** Short line on top ("Tocando agora", "Timer terminou"). */
  label: string
  title: string
  detail?: string
  /** CSS background for the artwork (album cover). */
  cover?: string
  /** 0..100, battery alerts. */
  percent?: number
  /** Timer/reminder that can be snoozed from the card. */
  snooze?: { kind: 'timer' | 'reminder'; title: string }
  meetLink?: string
  /** Calendar occurrence the "Confirmar" button marks as seen. */
  event?: { id: string; startMs: number }
  /** A new e-mail: "Ver" opens it in the browser. */
  mail?: MailMessage
  /** A color just picked with the eyedropper (copy buttons). */
  color?: PickedColor
  /** How long it stays when nobody hovers it. */
  ms: number
}

export type NewAlert = Omit<Alert, 'id' | 'ms'> & { ms?: number }

/** Alarms wait for the user longer; everything else is a glance. */
const DEFAULT_MS: Record<AlertKind, number> = {
  music: 5000,
  timer: 15000,
  reminder: 15000,
  // Long enough to reach "Confirmar"; missed, the pill keeps it until then.
  event: 15000,
  battery: 6000,
  device: 5000,
  notice: 6000,
  // Time to choose a format and copy it.
  color: 12000,
  // Time to read the sender and the subject and reach "Ver".
  email: 10000,
}
const MAX_QUEUE = 4

interface AlertsState {
  live: boolean
  current: Alert | null
  queue: Alert[]
}

export const useAlerts = create<AlertsState>(() => ({ live: false, current: null, queue: [] }))

let seq = 0
let timer: ReturnType<typeof setTimeout> | undefined
let held = false

function countdown() {
  clearTimeout(timer)
  const a = useAlerts.getState().current
  if (a && !held) timer = setTimeout(dismissAlert, a.ms)
}

/** Shows an alert now, or after the one on screen. Alarms jump the queue; a new song
 *  replaces a song still waiting. */
export function showAlert(a: NewAlert) {
  const alert: Alert = { ...a, id: `al-${++seq}`, ms: a.ms ?? DEFAULT_MS[a.kind] }
  const { current, queue } = useAlerts.getState()
  if (!current) {
    useAlerts.setState({ current: alert })
    countdown()
    return
  }
  if (alert.kind === 'music' && current.kind === 'music') {
    useAlerts.setState({ current: alert })
    countdown()
    return
  }
  const rest = queue.filter((q) => !(alert.kind === 'music' && q.kind === 'music'))
  const urgent = alert.kind === 'timer' || alert.kind === 'reminder'
  const next = urgent ? [alert, ...rest] : [...rest, alert]
  useAlerts.setState({ queue: next.slice(0, MAX_QUEUE) })
}

export function dismissAlert() {
  clearTimeout(timer)
  held = false
  const [next, ...queue] = useAlerts.getState().queue
  useAlerts.setState({ current: next ?? null, queue })
  if (next) countdown()
}

/** Pointer over the card: it stays; out: the countdown starts again. */
export function holdAlert(inside: boolean) {
  held = inside
  if (inside) clearTimeout(timer)
  else countdown()
}

/** "Adiar 5 min": the same timer/reminder again in 5 minutes (a real backend one, so it
 *  fires even if the notch is gone). */
export function snoozeAlert(a: Alert) {
  const s = a.snooze
  if (s?.kind === 'reminder') void backend.reminderAdd(s.title, Date.now() + snoozeMs)
  else if (s) void backend.timerAdd(s.title, Math.round(snoozeMs / 1000))
  dismissAlert()
}

/** Test helper: back to an empty queue. */
export function resetAlerts() {
  clearTimeout(timer)
  held = false
  useAlerts.setState({ live: false, current: null, queue: [] })
}
