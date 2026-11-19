import { create } from 'zustand'
import { backend } from '@/lib/ipc'

// Assistant presence shown by every surface. In F1 it is driven by the demo controls;
// from F2 on, by backend events, with the same shape.

export type Phase = 'idle' | 'listening' | 'thinking' | 'speaking'

export type Activity =
  | { kind: 'timer'; label: string; endsAt: number; total: number }
  | { kind: 'music'; title: string; artist: string; playing: boolean }
  | { kind: 'volume'; level: number }
  | { kind: 'event'; title: string; startsAt: number; endsAt: number; meetLink?: string }

export interface Presence {
  phase: Phase
  /** Live transcript / reply snippet shown while listening or speaking. */
  caption: string
  toast: string | null
  activity: Activity | null
}

interface AssistantState extends Presence {
  set: (patch: Partial<Presence>) => void
  connect: () => Promise<void>
}

const EVENT = 'ekko://assistant/presence'
/** Plain-text toast fired by the backend (e.g. a shortcut whose action comes later). */
const BACKEND_TOAST = 'ekko://toast'

let connected = false
let toastTimer: number | undefined

/** Toasts are short news: they clear themselves unless replaced first. */
export const TOAST_MS = 3000

export const IDLE: Presence = { phase: 'idle', caption: '', toast: null, activity: null }

export const useAssistant = create<AssistantState>((set, get) => ({
  ...IDLE,
  set: (patch) => {
    const next = { ...pick(get()), ...patch }
    set(next)
    void backend.broadcast(EVENT, next)
    const toast = patch.toast
    if (toast) {
      window.clearTimeout(toastTimer)
      toastTimer = window.setTimeout(() => {
        if (get().toast === toast) get().set({ toast: null })
      }, TOAST_MS)
    }
  },
  connect: async () => {
    if (connected) return
    connected = true
    await backend.listen<Presence>(EVENT, (p) => set(p))
    // Backend toasts reach every window already: show locally, no re-broadcast.
    await backend.listen<string>(BACKEND_TOAST, (toast) => {
      set({ toast })
      window.setTimeout(() => {
        if (get().toast === toast) set({ toast: null })
      }, TOAST_MS)
    })
  },
}))

/** Short toast in the notch (every window); clears itself after TOAST_MS. */
export function flashToast(text: string) {
  useAssistant.getState().set({ toast: text })
}

function pick(s: Presence): Presence {
  return { phase: s.phase, caption: s.caption, toast: s.toast, activity: s.activity }
}
