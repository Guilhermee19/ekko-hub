import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { Backend, Settings } from './types'

const EVENTS = {
  settingsChanged: 'ekko://settings/changed',
  hover: 'ekko://surface/hover',
  summon: 'ekko://surface/summon',
  notchAnchor: 'ekko://notch/anchor',
  paletteOpen: 'ekko://palette/open',
  alarm: 'ekko://alarm/show',
} as const

export const tauriBackend: Backend = {
  kind: 'tauri',
  getSettings: () => invoke<Settings>('get_settings'),
  onSettingsChanged: (cb) => listen<Settings>(EVENTS.settingsChanged, (e) => cb(e.payload)),
  setDisplayMode: (mode) => invoke('set_display_mode', { mode }),
  setPersona: (persona) => invoke('set_persona', { persona }),
  setDockSide: (side) => invoke('set_dock_side', { side }),
  setNames: (userName, assistantName) => invoke('set_names', { userName, assistantName }),
  openSettings: () => invoke('open_settings'),
  summon: () => invoke('summon'),
  showPanelBesideOrb: () => invoke('show_panel_beside_orb'),
  setHitRect: (rect) => invoke('set_hit_rect', { rect }),
  onHover: (cb) => listen<boolean>(EVENTS.hover, (e) => cb(e.payload)),
  onSummon: (cb) => listen(EVENTS.summon, () => cb()),
  broadcast: (event, payload) => emit(event, payload),
  listen: (event, cb) => listen(event, (e) => cb(e.payload as never)),
  setNotch: (notch) => invoke('set_notch', { notch }),
  listMonitors: () => invoke('list_monitors'),
  setMonitor: (index) => invoke('set_monitor', { index }),
  notchDrag: (phase) => invoke(`notch_drag_${phase}`),
  getNotchAnchor: () => invoke<number | null>('get_notch_anchor'),
  onNotchAnchor: (cb) => listen<number>(EVENTS.notchAnchor, (e) => cb(e.payload)),
  onFocusChanged: (cb) => getCurrentWindow().onFocusChanged((e) => cb(e.payload)),
  focusSelf: () => getCurrentWindow().setFocus(),
  togglePalette: () => invoke('toggle_palette'),
  onPaletteOpen: (cb) => listen(EVENTS.paletteOpen, () => cb()),
  openOnboarding: () => invoke('open_onboarding'),
  finishOnboarding: () => invoke('finish_onboarding'),
  showAlarm: (alarm) => invoke('show_alarm', { alarm }),
  takeAlarm: () => invoke('take_alarm'),
  onAlarm: (cb) => listen(EVENTS.alarm, (e) => cb(e.payload as never)),
  hideSelf: () => getCurrentWindow().hide(),
  startDragging: () => getCurrentWindow().startDragging(),
}

export function currentWindowLabel(): string {
  return getCurrentWindow().label
}
