import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { tauriClipboard } from './clipboardTauri'
import { tauriGeneral } from './generalTauri'
import { tauriIntegrations } from './integrationsTauri'
import { tauriProductivity } from './productivityTauri'
import { tauriShelf } from './shelfTauri'
import { tauriCapture } from './captureTauri'
import { tauriHud } from './hudTauri'
import { tauriSystem } from './systemTauri'
import type { Backend, Settings } from './types'
import type { TimersSnapshot } from './types'
import {
  AUDIO_LEVELS,
  MEDIA_CHANGED,
  VOLUME_CHANGED,
  type NowPlaying,
  type VolumeState,
} from './mediaTypes'

const TIMERS_CHANGED = 'ekko://timers/changed'

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
  ...tauriIntegrations,
  ...tauriGeneral,
  ...tauriProductivity,
  ...tauriSystem,
  ...tauriClipboard,
  ...tauriShelf,
  ...tauriCapture,
  ...tauriHud,
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
  setAppearance: (appearance) => invoke('set_appearance', { appearance }),
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
  listTimers: () => invoke('list_timers'),
  onTimersChanged: (cb) => listen<TimersSnapshot>(TIMERS_CHANGED, (e) => cb(e.payload)),
  timerAdd: (label, seconds) => invoke('timer_add', { label, seconds }),
  timerPause: (id) => invoke('timer_pause', { id }),
  timerResume: (id) => invoke('timer_resume', { id }),
  timerCancel: (id) => invoke('timer_cancel', { id }),
  timerExtend: (id, seconds) => invoke('timer_extend', { id, seconds }),
  pomodoro: (action) => invoke('pomodoro', { action }),
  mediaNow: () => invoke<NowPlaying | null>('media_now'),
  onMediaChanged: (cb) => listen<NowPlaying | null>(MEDIA_CHANGED, (e) => cb(e.payload)),
  mediaPlayPause: () => invoke('media_play_pause'),
  mediaNext: () => invoke('media_next'),
  mediaPrevious: () => invoke('media_previous'),
  mediaSeek: (positionMs) => invoke('media_seek', { positionMs }),
  onAudioLevels: (cb) => listen<number[]>(AUDIO_LEVELS, (e) => cb(e.payload)),
  volumeGet: () => invoke('volume_get'),
  volumeSet: (level) => invoke('volume_set', { level }),
  volumeStep: (delta) => invoke('volume_step', { delta }),
  volumeMute: (on) => invoke('volume_mute', { on }),
  onVolumeChanged: (cb) => listen<VolumeState>(VOLUME_CHANGED, (e) => cb(e.payload)),
}

export function currentWindowLabel(): string {
  return getCurrentWindow().label
}
