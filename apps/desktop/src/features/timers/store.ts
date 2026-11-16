import { create } from 'zustand'
import { backend, type TimersSnapshot } from '@/lib/ipc'

// Timers and pomodoro live in the backend (Rust in Tauri, `mockTimers` in the gallery);
// this store mirrors its snapshot in every window. The stopwatch is a local UI tool.

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
  /** Finished focus blocks. */
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
  extendTimer: (id: string, seconds: number) => void
  swStart: () => void
  swPause: () => void
  swLap: () => void
  swReset: () => void
  pomoStart: () => void
  pomoPause: () => void
  /** Ends the current phase now (the backend also advances it when it reaches zero). */
  pomoSkip: () => void
  pomoReset: () => void
}

export const phaseSeconds = (p: Pomodoro) => (p.phase === 'focus' ? p.focusMin : p.breakMin) * 60
export const POMO_LABEL: Record<PomodoroPhase, string> = { focus: 'Foco', break: 'Pausa' }

/** Backend snapshot → the shape the UI (Home, badges, notch) already uses. */
export function fromSnapshot(s: TimersSnapshot): Pick<TimersState, 'timers' | 'pomodoro'> {
  return {
    timers: s.timers.map((t) => ({
      id: t.id,
      label: t.label,
      endsAt: t.endsAtMs,
      total: Math.round(t.totalMs / 1000),
      ...(t.pausedLeftMs !== null && { pausedLeft: t.pausedLeftMs }),
    })),
    pomodoro: {
      phase: s.pomodoro.phase,
      endsAt: s.pomodoro.endsAtMs,
      pausedLeft: s.pomodoro.pausedLeftMs,
      cycles: s.pomodoro.cycles,
      focusMin: s.pomodoro.focusMin,
      breakMin: s.pomodoro.breakMin,
    },
  }
}

const IDLE_STOPWATCH: Stopwatch = { startedAt: null, elapsed: 0, laps: [] }

export const useTimers = create<TimersState>((set) => {
  const apply = (s: TimersSnapshot) => set(fromSnapshot(s))
  const run = (call: Promise<TimersSnapshot>) =>
    void call.then(apply, (err: unknown) => console.error('[ekko] timers:', err))
  const swNow = (sw: Stopwatch) => sw.elapsed + (sw.startedAt ? Date.now() - sw.startedAt : 0)

  return {
    timers: [],
    stopwatch: IDLE_STOPWATCH,
    pomodoro: {
      phase: 'focus',
      endsAt: null,
      pausedLeft: null,
      cycles: 0,
      focusMin: 25,
      breakMin: 5,
    },

    addTimer: (label, seconds) => run(backend.timerAdd(label, seconds)),
    pauseTimer: (id) => run(backend.timerPause(id)),
    resumeTimer: (id) => run(backend.timerResume(id)),
    cancelTimer: (id) => run(backend.timerCancel(id)),
    extendTimer: (id, seconds) => run(backend.timerExtend(id, seconds)),

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

    pomoStart: () => run(backend.pomodoro('start')),
    pomoPause: () => run(backend.pomodoro('pause')),
    pomoSkip: () => run(backend.pomodoro('skip')),
    pomoReset: () => run(backend.pomodoro('reset')),
  }
})

// Sync with the backend once per window: initial snapshot, then every change.
void backend
  .listTimers()
  .then((s) => useTimers.setState(fromSnapshot(s)))
  .catch((err: unknown) => console.error('[ekko] timers:', err))
void backend.onTimersChanged((s) => useTimers.setState(fromSnapshot(s)))
