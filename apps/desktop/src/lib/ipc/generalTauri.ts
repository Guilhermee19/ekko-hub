import { invoke } from '@tauri-apps/api/core'
import type { GeneralBackend } from './generalTypes'

export const tauriGeneral: GeneralBackend = {
  setAutostart: (on) => invoke('set_autostart', { on }),
  setGeneral: (general) => invoke('set_general', { general }),
  setShortcuts: (shortcuts) => invoke('set_shortcuts', { shortcuts }),
  shortcutStatus: () => invoke('shortcut_status'),
}
