import { create } from 'zustand'
import { backend, DEFAULT_SETTINGS, type Settings } from '@/lib/ipc'

/** How long quick alerts and toasts stay in the pill (Notch → Avisos rápidos, 1..10 s). */
export function alertMs(): number {
  const s = useSettings.getState().settings.notch.alertSeconds
  return Math.min(10, Math.max(1, s || 5)) * 1000
}

interface SettingsState {
  settings: Settings
  loaded: boolean
  init: () => Promise<void>
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  init: async () => {
    if (get().loaded) return
    set({ settings: await backend.getSettings(), loaded: true })
    // Backend broadcasts every change, so all windows stay in sync.
    await backend.onSettingsChanged((settings) => set({ settings }))
  },
}))
