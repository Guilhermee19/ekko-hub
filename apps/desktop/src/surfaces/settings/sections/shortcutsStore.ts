import { create } from 'zustand'
import { backend, type ShortcutReport, type ShortcutSettings } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import type { ShortcutId } from './shortcutsCombo'

// Real shortcut settings (persisted in `Settings.shortcuts`) plus the registration status
// the backend reports after each change.

interface ShortcutsState {
  reports: Partial<Record<ShortcutId, ShortcutReport>>
  saving: boolean
  refresh: () => Promise<void>
  save: (shortcuts: ShortcutSettings) => Promise<void>
  setShortcut: (id: ShortcutId, combo: string) => Promise<void>
}

const byAction = (list: ShortcutReport[]) =>
  Object.fromEntries(list.map((r) => [r.action, r])) as Partial<Record<ShortcutId, ShortcutReport>>

export const useShortcuts = create<ShortcutsState>((set, get) => ({
  reports: {},
  saving: false,
  refresh: async () => set({ reports: byAction(await backend.shortcutStatus()) }),
  save: async (shortcuts) => {
    set({ saving: true })
    try {
      set({ reports: byAction(await backend.setShortcuts(shortcuts)) })
    } finally {
      set({ saving: false })
    }
  },
  setShortcut: (id, combo) =>
    get().save({ ...useSettings.getState().settings.shortcuts, [id]: combo }),
}))
