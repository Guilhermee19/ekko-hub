import type { Backend, PomodoroInfo, TimerInfo, TimersSnapshot, Unlisten } from './types'

// In-memory port of crates/ekko-core timers + pomodoro, for the browser gallery.

type TimerMethods = Pick<
  Backend,
  | 'listTimers'
  | 'onTimersChanged'
  | 'timerAdd'
  | 'timerPause'
  | 'timerResume'
  | 'timerCancel'
  | 'timerExtend'
  | 'pomodoro'
>

interface Deps {
  on: (event: string, cb: (payload: unknown) => void) => Promise<Unlisten>
  fire: (event: string, payload: unknown) => void
  showAlarm: (alarm: unknown) => Promise<void>
}

const CHANGED = 'ekko://timers/changed'
export const NOTIFY_EVENT = 'ekko://notify'
const MIN = 60_000
let seq = 0

function seed(now: number): TimersSnapshot {
  const t = (id: string, label: string, totalMin: number, leftMs: number, paused = false) => ({
    id,
    label,
    totalMs: totalMin * MIN,
    endsAtMs: now + leftMs,
    pausedLeftMs: paused ? leftMs : null,
  })
  return {
    timers: [
      t('tm1', 'Café passando', 5, 3 * MIN + 20_000),
      t('tm2', 'Pão de queijo no forno', 25, 17 * MIN),
      t('tm3', 'Ligar para o cliente', 10, 7 * MIN + 45_000, true),
    ],
    pomodoro: {
      phase: 'focus',
      endsAtMs: null,
      pausedLeftMs: null,
      cycles: 2,
      focusMin: 25,
      breakMin: 5,
      autoAdvance: false,
    },
  }
}

const phaseMs = (p: PomodoroInfo) => (p.phase === 'focus' ? p.focusMin : p.breakMin) * MIN

function advance(p: PomodoroInfo): PomodoroInfo {
  const focus = p.phase === 'focus'
  const next: PomodoroInfo = {
    ...p,
    phase: focus ? 'break' : 'focus',
    cycles: focus ? p.cycles + 1 : p.cycles,
    pausedLeftMs: null,
    endsAtMs: null,
  }
  return p.autoAdvance ? { ...next, endsAtMs: Date.now() + phaseMs(next) } : next
}

export function mockTimers({ on, fire, showAlarm }: Deps): TimerMethods {
  let state = seed(Date.now())
  let ticking = false

  const commit = (next: TimersSnapshot) => {
    state = next
    fire(CHANGED, state)
    return Promise.resolve(state)
  }
  const patch = (id: string, fn: (t: TimerInfo) => TimerInfo) =>
    commit({ ...state, timers: state.timers.map((t) => (t.id === id ? fn(t) : t)) })
  const alarm = (id: string, title: string, detail: string) => {
    fire(NOTIFY_EVENT, { kind: 'timer', title, body: detail })
    void showAlarm({ id, kind: 'timer', title, detail, firedAt: Date.now() })
  }

  // Lazy so importing the mock (tests) never leaves an interval behind.
  const ensureTicking = () => {
    if (ticking) return
    ticking = true
    globalThis.setInterval(() => {
      const now = Date.now()
      const done = state.timers.filter((t) => t.pausedLeftMs === null && t.endsAtMs <= now)
      const p = state.pomodoro
      const pomoDone = p.endsAtMs !== null && p.endsAtMs <= now
      if (!done.length && !pomoDone) return
      void commit({
        timers: state.timers.filter((t) => !done.includes(t)),
        pomodoro: pomoDone ? advance(p) : p,
      })
      done.forEach((t) => alarm(t.id, t.label, `Timer de ${Math.round(t.totalMs / MIN)} min`))
      if (pomoDone) {
        const focus = p.phase === 'focus'
        alarm(
          `pomo-${now}`,
          focus ? 'Foco concluído' : 'Pausa terminou',
          focus ? `Hora da pausa de ${p.breakMin} min` : 'Bora voltar ao foco',
        )
      }
    }, 250)
  }

  return {
    listTimers: () => {
      ensureTicking()
      return Promise.resolve(state)
    },
    onTimersChanged: (cb) => on(CHANGED, (s) => cb(s as TimersSnapshot)),
    timerAdd: (label, seconds) => {
      ensureTicking()
      const totalMs = Math.max(1, seconds) * 1000
      const timer: TimerInfo = {
        id: `tm-${Date.now().toString(36)}-${seq++}`,
        label: label.trim() || 'Timer',
        totalMs,
        endsAtMs: Date.now() + totalMs,
        pausedLeftMs: null,
      }
      return commit({ ...state, timers: [timer, ...state.timers] })
    },
    timerPause: (id) =>
      patch(id, (t) =>
        t.pausedLeftMs !== null ? t : { ...t, pausedLeftMs: Math.max(0, t.endsAtMs - Date.now()) },
      ),
    timerResume: (id) =>
      patch(id, (t) =>
        t.pausedLeftMs === null
          ? t
          : { ...t, endsAtMs: Date.now() + t.pausedLeftMs, pausedLeftMs: null },
      ),
    timerCancel: (id) => commit({ ...state, timers: state.timers.filter((t) => t.id !== id) }),
    timerExtend: (id, seconds) =>
      patch(id, (t) => {
        const ms = seconds * 1000
        return t.pausedLeftMs === null
          ? { ...t, totalMs: t.totalMs + ms, endsAtMs: t.endsAtMs + ms }
          : { ...t, totalMs: t.totalMs + ms, pausedLeftMs: t.pausedLeftMs + ms }
      }),
    pomodoro: (action) => {
      ensureTicking()
      const p = state.pomodoro
      const now = Date.now()
      const next: Record<typeof action, PomodoroInfo> = {
        start:
          p.endsAtMs !== null
            ? p
            : { ...p, endsAtMs: now + (p.pausedLeftMs ?? phaseMs(p)), pausedLeftMs: null },
        pause:
          p.endsAtMs === null
            ? p
            : { ...p, endsAtMs: null, pausedLeftMs: Math.max(0, p.endsAtMs - now) },
        skip: { ...advance({ ...p, autoAdvance: false }), autoAdvance: p.autoAdvance },
        reset: { ...p, phase: 'focus', endsAtMs: null, pausedLeftMs: null },
      }
      return commit({ ...state, pomodoro: next[action] })
    },
  }
}
