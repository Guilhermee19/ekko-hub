// Mirrors crates/ekko-core (general.rs, shortcuts.rs) + services/shortcuts.rs.

export type NotifySound = 'none' | 'chime' | 'ping' | 'soft'

export interface DndSettings {
  enabled: boolean
  /** Local "HH:MM"; the window may cross midnight (22:00 → 07:00). */
  from: string
  to: string
}

/** Calendar nudges in the notch (mirrors `EventAlerts`). */
export interface EventAlerts {
  /** Minutes before the start; 0 = only at the start. */
  beforeMin: number
  /** Extra nudges after the start while the event is not confirmed. */
  repeats: number
  /** Minutes between those extra nudges. */
  everyMin: number
}

export const DEFAULT_EVENT_ALERTS: EventAlerts = { beforeMin: 5, repeats: 1, everyMin: 5 }

export interface GeneralSettings {
  /** Mirrors the OS; change it only through `setAutostart`. */
  autostart: boolean
  hideFullscreen: boolean
  dnd: DndSettings
  sound: NotifySound
  /** 0..1 */
  volume: number
  eventAlerts: EventAlerts
}

export const DEFAULT_GENERAL: GeneralSettings = {
  autostart: false,
  hideFullscreen: true,
  dnd: { enabled: false, from: '22:00', to: '07:00' },
  sound: 'chime',
  volume: 0.6,
  eventAlerts: DEFAULT_EVENT_ALERTS,
}

export type ShortcutAction =
  'summon' | 'palette' | 'ptt' | 'selection' | 'dictation' | 'interrupt' | 'capture' | 'color'

export type ShortcutSettings = Record<ShortcutAction, string>

export const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = {
  summon: 'Ctrl+Shift+Space',
  palette: 'Ctrl+Alt+Space',
  ptt: 'Ctrl+Alt+V',
  selection: 'Ctrl+Shift+E',
  dictation: 'Ctrl+Shift+D',
  interrupt: 'Alt+Shift+X',
  // Alt Gr is Ctrl+Alt on Windows: "Alt Gr + Print Screen".
  capture: 'Ctrl+Alt+PrintScreen',
  // Like PowerToys' color picker.
  color: 'Win+Shift+C',
}

/** `taken`: another app (or another Ekko action) owns the combo. */
/** `pending`: saved, but not grabbed globally until its feature exists. */
export type ShortcutStatus = 'ok' | 'taken' | 'invalid' | 'pending'

export interface ShortcutReport {
  action: ShortcutAction
  status: ShortcutStatus
  /** Combo really registered (a default may fall back to its alternative). */
  active: string | null
}

export interface GeneralBackend {
  /** Returns the real OS state afterwards. */
  setAutostart(on: boolean): Promise<boolean>
  /** Everything in "Geral" except autostart. */
  setGeneral(general: GeneralSettings): Promise<void>
  /** Saves and re-registers the global shortcuts. */
  setShortcuts(shortcuts: ShortcutSettings): Promise<ShortcutReport[]>
  shortcutStatus(): Promise<ShortcutReport[]>
}
