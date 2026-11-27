import { useEffect } from 'react'
import { isAcked, useCalendar } from '@/features/calendar/store'
import { useMusic } from '@/features/music/store'
import { backend, type CalendarReminder, type MailMessage } from '@/lib/ipc'
import { dndActive } from '@/lib/quietHours'
import { rainAlertText } from '@/features/weather/weather'
import { useSettings } from '@/stores/settings'
import { showAlert, useAlerts } from './store'

/** Alarm the backend sends to the notch instead of opening the alarm window. */
const ALARM_NOTCH = 'ekko://alarm/notch'

interface NotchAlarm {
  kind: 'timer' | 'reminder'
  title: string
  detail?: string
}

/** A paused song coming back counts as "started" again after this long. */
const RESUME_AGAIN_MS = 60_000

/** "Não perturbe": the glanceable alerts stay quiet (alarms still show). */
const quiet = () => dndActive(useSettings.getState().settings.general.dnd, new Date())

/**
 * Feeds the notch's alert card: songs starting or changing, timers and reminders going
 * off, meetings coming up, low battery and devices connecting. Mount once, in the notch.
 */
export function useAlertSources() {
  useEffect(() => {
    useAlerts.setState({ live: true })
    const offs = [watchMusic(), watchCalendar()]
    const offAlarm = backend.listen<NotchAlarm>(ALARM_NOTCH, (a) =>
      showAlert({
        kind: a.kind,
        label: a.kind === 'timer' ? 'Timer terminou' : 'Lembrete',
        title: a.title,
        detail: a.detail,
        snooze: { kind: a.kind, title: a.title },
      }),
    )
    const offColor = backend.onColorPicked((c) =>
      showAlert({
        kind: 'color',
        label: 'Cor escolhida',
        title: c.hex.toUpperCase(),
        detail: `${c.rgb} · ${c.hsl}`,
        color: c,
      }),
    )
    const offMail = backend.onMailNew((list) => {
      if (!quiet() && list.length) showAlert(mailAlert(list))
    })
    const offWeather = backend.onWeatherAlert((e) => {
      if (quiet()) return
      showAlert({
        kind: 'weather',
        ...rainAlertText(e, Date.now()),
        danger: e.alert.severity === 'storm',
      })
    })
    const offHud = backend.onHud((e) => {
      if (quiet()) return
      if (e.kind === 'lowBattery') {
        showAlert({
          kind: 'battery',
          label: 'Bateria fraca',
          title: e.device ?? 'Notebook',
          detail: `${e.percent}% restantes`,
          percent: e.percent,
        })
      } else if (e.kind === 'device' && e.connected) {
        showAlert({
          kind: 'device',
          label: 'Conectado',
          title: e.name,
          detail: `Bateria em ${e.percent}%`,
          percent: e.percent,
        })
      }
    })
    return () => {
      useAlerts.setState({ live: false })
      offs.forEach((off) => off())
      void offAlarm.then((f) => f())
      void offColor.then((f) => f())
      void offHud.then((f) => f())
      void offMail.then((f) => f())
      void offWeather.then((f) => f())
    }
  }, [])
}

function watchMusic() {
  // What is playing when the notch opens is not news.
  let shown = useMusic.getState().track?.id ?? null
  let wasPlaying = useMusic.getState().playing
  let shownAt = Date.now()
  return useMusic.subscribe((s) => {
    const id = s.track?.id ?? null
    const started = s.playing && !wasPlaying
    wasPlaying = s.playing
    if (!s.track || !s.playing || quiet()) return
    const changed = id !== shown
    if (!changed && !(started && Date.now() - shownAt > RESUME_AGAIN_MS)) return
    shown = id
    shownAt = Date.now()
    showAlert({
      kind: 'music',
      label: 'Tocando agora',
      title: s.track.title,
      detail: s.track.artist,
      cover: s.track.cover,
    })
  })
}

function watchCalendar() {
  let last: CalendarReminder | null = useCalendar.getState().reminder
  return useCalendar.subscribe((s) => {
    const r = s.reminder
    if (!r || r === last) return
    last = r
    const e = r.event
    if (quiet() || isAcked(s.acked, e)) return
    showAlert({
      kind: 'event',
      label: reminderLabel(r),
      title: e.title,
      detail: [span(e.startMs, e.endMs), e.location].filter(Boolean).join(' · '),
      meetLink: e.meetLink ?? undefined,
      event: { id: e.id, startMs: e.startMs },
    })
  })
}

/** One alert for a burst: the newest message, with how many came along. */
export function mailAlert(list: MailMessage[]) {
  const [m] = list
  const service = m.provider === 'gmail' ? 'Gmail' : 'Outlook'
  return {
    kind: 'email' as const,
    label:
      list.length > 1 ? `${service} · ${list.length} e-mails novos` : `${service} · e-mail novo`,
    title: m.subject,
    detail: [m.fromName, m.snippet].filter(Boolean).join(' · '),
    mail: m,
  }
}

function reminderLabel(r: CalendarReminder): string {
  if (r.phase === 'late') return `Agenda · começou há ${Math.abs(r.minutesLeft)} min`
  if (r.phase === 'start' || r.minutesLeft <= 0) return 'Agenda · começando agora'
  return `Agenda · em ${r.minutesLeft} min`
}

const hhmm = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const span = (from: number, to: number) => `${hhmm(from)} – ${hhmm(to)}`
