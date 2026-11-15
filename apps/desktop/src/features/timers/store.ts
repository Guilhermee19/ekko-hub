import { create } from 'zustand'
import { useAssistant } from '@/stores/assistant'

// Feature-local mock store (F1b). The backend replaces it later with the same shape.

export interface Timer {
  id: string
  label: string
  /** Epoch ms; meaningless while paused. */
  endsAt: number
  /** Seconds. */
  total: number
  /** Ms left when paused. */
  pausedLeft?: number
}

export interface Stopwatch {
  /** Epoch ms of the current run, null when stopped. */
  startedAt: number | null
  /** Ms accumulated by previous runs. */
  elapsed: number
  /** Cumulative elapsed ms at each lap. */
  laps: number[]
}

export type PomodoroPhase = 'focus' | 'break'

export interface Pomodoro {
  phase: PomodoroPhase
  /** Epoch ms while running, null when idle or paused. */
  endsAt: number | null
  /** Ms left when paused. */
  pausedLeft: number | null
  /** Finished focus blocks today. */
  cycles: number
  focusMin: number
  breakMin: number
}

interface TimersState {
  timers: Timer[]
  stopwatch: Stopwatch
  pomodoro: Pomodoro
  addTimer: (label: string, seconds: number) => void
  pauseTimer: (id: string) => void
  resumeTimer: (id: string) => void
  cancelTimer: (id: string) => void
  swStart: () => void
  swPause: () => void
  swLap: () => void
  swReset: () => void
  pomoStart: () => void
  pomoPause: () => void
  /** Ends the current phase now (also called when the countdown reaches zero). */
  pomoSkip: () => void
  pomoReset: () => void
}

export const phaseSeconds = (p: Pomodoro) => (p.phase === 'focus' ? p.focusMin : p.breakMin) * 60
export const POMO_LABEL: Record<PomodoroPhase, string> = { focus: 'Foco', break: 'Pausa' }

/** Mirror a running countdown in the notch pill. */
function showInNotch(label: string, endsAt: number, total: number) {
  useAssistant.getState().set({ activity: { kind: 'timer', label, endsAt, total } })
}

/** Clear the notch only if it is still showing this countdown. */
function clearNotch(label: string) {
  const { activity, set } = useAssistant.getState()
  if (activity?.kind === 'timer' && activity.label === label) set({ activity: null })
}

let seq = 0
const uid = () => `tm-${Date.now().toString(36)}-${(seq++).toString(36)}`

const now = Date.now()

const MOCK_TIMERS: Timer[] = [
  { id: 'tm1', label: 'Café passando', endsAt: now + 3 * 60_000 + 20_000, total: 5 * 60 },
  { id: 'tm2', label: 'Pão de queijo no forno', endsAt: now + 17 * 60_000, total: 25 * 60 },
  {
    id: 'tm3',
    label: 'Ligar para o cliente',
    endsAt: now,
    total: 10 * 60,
    pausedLeft: 7 * 60_000 + 45_000,
  },
]

const IDLE_STOPWATCH: Stopwatch = { startedAt: null, elapsed: 0, laps: [] }

export const useTimers = create<TimersState>((set, get) => {
  const patchTimer = (id: string, fn: (t: Timer) => Timer) =>
    set((s) => ({ timers: s.timers.map((t) => (t.id === id ? fn(t) : t)) }))
  const swNow = (sw: Stopwatch) => sw.elapsed + (sw.startedAt ? Date.now() - sw.startedAt : 0)

  return {
    timers: MOCK_TIMERS,
    stopwatch: IDLE_STOPWATCH,
    pomodoro: {
      phase: 'focus',
      endsAt: null,
      pausedLeft: null,
      cycles: 2,
      focusMin: 25,
      breakMin: 5,
    },

    addTimer: (label, seconds) => {
      const timer = {
        id: uid(),
        label: label.trim() || 'Timer',
        endsAt: Date.now() + seconds * 1000,
        total: seconds,
      }
      set((s) => ({ timers: [timer, ...s.timers] }))
      showInNotch(timer.label, timer.endsAt, timer.total)
    },
    pauseTimer: (id) => {
      const t = get().timers.find((x) => x.id === id)
      if (!t || t.pausedLeft !== undefined) return
      patchTimer(id, (x) => ({ ...x, pausedLeft: Math.max(0, x.endsAt - Date.now()) }))
      clearNotch(t.label)
    },
    resumeTimer: (id) => {
      const t = get().timers.find((x) => x.id === id)
      if (!t || t.pausedLeft === undefined) return
      const endsAt = Date.now() + t.pausedLeft
      patchTimer(id, (x) => ({ ...x, endsAt, pausedLeft: undefined }))
      showInNotch(t.label, endsAt, t.total)
    },
    cancelTimer: (id) => {
      const t = get().timers.find((x) => x.id === id)
      set((s) => ({ timers: s.timers.filter((x) => x.id !== id) }))
      if (t) clearNotch(t.label)
    },

    swStart: () =>
      set((s) =>
        s.stopwatch.startedAt ? s : { stopwatch: { ...s.stopwatch, startedAt: Date.now() } },
      ),
    swPause: () =>
      set((s) => ({ stopwatch: { ...s.stopwatch, elapsed: swNow(s.stopwatch), startedAt: null } })),
    swLap: () =>
      set((s) => ({
        stopwatch: { ...s.stopwatch, laps: [...s.stopwatch.laps, swNow(s.stopwatch)] },
      })),
    swReset: () => set({ stopwatch: IDLE_STOPWATCH }),

    pomoStart: () => {
      const p = get().pomodoro
      if (p.endsAt) return
      const endsAt = Date.now() + (p.pausedLeft ?? phaseSeconds(p) * 1000)
      set({ pomodoro: { ...p, endsAt, pausedLeft: null } })
      showInNotch(POMO_LABEL[p.phase], endsAt, phaseSeconds(p))
    },
    pomoPause: () => {
      const p = get().pomodoro
      if (!p.endsAt) return
      set({ pomodoro: { ...p, endsAt: null, pausedLeft: Math.max(0, p.endsAt - Date.now()) } })
      clearNotch(POMO_LABEL[p.phase])
    },
    pomoSkip: () => {
      const p = get().pomodoro
      clearNotch(POMO_LABEL[p.phase])
      const finishedFocus = p.phase === 'focus'
      set({
        pomodoro: {
          ...p,
          phase: finishedFocus ? 'break' : 'focus',
          cycles: finishedFocus ? p.cycles + 1 : p.cycles,
          endsAt: null,
          pausedLeft: null,
        },
      })
    },
    pomoReset: () => {
      const p = get().pomodoro
      clearNotch(POMO_LABEL[p.phase])
      set({ pomodoro: { ...p, phase: 'focus', endsAt: null, pausedLeft: null } })
    },
  }
})
