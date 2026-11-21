import { useEffect } from 'react'
import { useCalendar } from '@/features/calendar/store'
import { useMusic } from '@/features/music/store'
import { backend, type CalendarReminder } from '@/lib/ipc'
import { dndActive } from '@/lib/quietHours'
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
    if (quiet()) return
    const e = r.event
    showAlert({
      kind: 'event',
      label:
        r.phase === 'start' || r.minutesLeft <= 0
          ? 'Agenda · começando agora'
          : `Agenda · em ${r.minutesLeft} min`,
      title: e.title,
      detail: [span(e.startMs, e.endMs), e.location].filter(Boolean).join(' · '),
      meetLink: e.meetLink ?? undefined,
    })
  })
}

const hhmm = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const span = (from: number, to: number) => `${hhmm(from)} – ${hhmm(to)}`
