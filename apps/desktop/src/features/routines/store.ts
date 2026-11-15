import { create } from 'zustand'
import { useAssistant } from '@/stores/assistant'
import { catalogAction } from './catalog'
import type { Routine } from './model'

interface RoutinesState {
  routines: Routine[]
  setEnabled: (id: string, enabled: boolean) => void
  /** Mock run: toast + "last run" update. */
  runNow: (id: string) => void
  /** Insert or replace by id. */
  save: (routine: Routine) => void
  remove: (id: string) => void
}

const at = (daysAgo: number, h: number, m: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

const step = (catalogId: string, i: number) => ({ id: `${catalogId}-${i}`, catalogId })

const ROUTINES: Routine[] = [
  {
    id: 'r1',
    name: 'Bom dia',
    trigger: { kind: 'time', time: '07:30', days: 'weekdays' },
    steps: ['briefing', 'spotify-lofi', 'volume-30'].map(step),
    enabled: true,
    lastRunAt: at(0, 7, 30),
  },
  {
    id: 'r2',
    name: 'Começar o dia por voz',
    trigger: { kind: 'phrase', phrase: 'bom dia' },
    steps: ['weather', 'tasks'].map(step),
    enabled: true,
    lastRunAt: at(1, 8, 12),
  },
  {
    id: 'r3',
    name: 'Modo trabalho',
    trigger: { kind: 'event', event: 'pc-on' },
    steps: ['vscode', 'focus', 'pomodoro'].map(step),
    enabled: false,
    lastRunAt: at(4, 9, 2),
  },
  {
    id: 'r4',
    name: 'Fim de expediente',
    trigger: { kind: 'time', time: '18:30', days: 'weekdays' },
    steps: ['close-work', 'spotify-lofi'].map(step),
    enabled: true,
    lastRunAt: null,
  },
]

function flashToast(text: string) {
  // Auto-clears: see TOAST_MS in stores/assistant.
  useAssistant.getState().set({ toast: text })
}

export const useRoutines = create<RoutinesState>((set, get) => ({
  routines: ROUTINES,
  setEnabled: (id, enabled) =>
    set({ routines: get().routines.map((r) => (r.id === id ? { ...r, enabled } : r)) }),
  runNow: (id) => {
    const r = get().routines.find((x) => x.id === id)
    if (!r) return
    const first = r.steps[0] ? catalogAction(r.steps[0].catalogId).label : 'nenhuma ação'
    flashToast(`Rotina “${r.name}”: ${first}…`)
    set({
      routines: get().routines.map((x) => (x.id === id ? { ...x, lastRunAt: Date.now() } : x)),
    })
  },
  save: (routine) => {
    const { routines } = get()
    const exists = routines.some((r) => r.id === routine.id)
    set({
      routines: exists
        ? routines.map((r) => (r.id === routine.id ? routine : r))
        : [...routines, routine],
    })
  },
  remove: (id) => set({ routines: get().routines.filter((r) => r.id !== id) }),
}))
