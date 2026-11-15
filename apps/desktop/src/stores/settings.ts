import { create } from 'zustand'
import { backend, DEFAULT_SETTINGS, type Settings } from '@/lib/ipc'

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
