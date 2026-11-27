import { canvas, placeNotch } from '../notchGeometry'
import { mockClipboard } from './clipboardMock'
import { mockGeneral } from './generalMock'
import { mockIntegrations } from './integrationsMock'
import { mockMedia } from './mockMedia'
import { mockProductivity } from './mockProductivity'
import { mockShelf } from './shelfMock'
import { mockCapture } from './captureMock'
import { mockUpdate } from './updateMock'
import { mockColor } from './colorMock'
import { mockHud } from './hudMock'
import { mockMail } from './mailMock'
import { mockWeather } from './weatherMock'
import { mockSystem } from './systemMock'
import { mockTimers } from './mockTimers'
import {
  DEFAULT_SETTINGS,
  type Backend,
  type MonitorInfo,
  type Settings,
  type Unlisten,
} from './types'

// In-memory backend for the browser gallery. Same contract as Tauri, no OS effects.

type Handler = (payload: unknown) => void
const bus = new Map<string, Set<Handler>>()
let settings: Settings = { ...DEFAULT_SETTINGS }

function on(event: string, cb: Handler): Promise<Unlisten> {
  const set = bus.get(event) ?? new Set()
  set.add(cb)
  bus.set(event, set)
  return Promise.resolve(() => set.delete(cb))
}

function fire(event: string, payload: unknown) {
  bus.get(event)?.forEach((cb) => cb(payload))
}

function mockAnchor() {
  return placeNotch(FAKE_SCREEN_W, canvas(settings.notch.size).w, settings.notch.offset).anchor
}

function patch(change: Partial<Settings>) {
  settings = { ...settings, ...change }
  fire('settings', settings)
  fire('notch-anchor', mockAnchor())
  return Promise.resolve()
}

const noop = () => Promise.resolve()

export const MOCK_PANEL_EVENT = 'mock://panel'
/** Gallery overlays for flows that are separate windows in Tauri. */
export const MOCK_PALETTE_EVENT = 'mock://palette'
export const MOCK_ONBOARDING_EVENT = 'mock://onboarding'
export const MOCK_ALARM_EVENT = 'mock://alarm'
/** A gallery "window" asked to hide itself (palette after running a command). */
export const MOCK_HIDE_EVENT = 'mock://hide'
let pendingAlarm: unknown = null

/** Width of the gallery's fake desktop (FakeDesktop SCREEN.w). */
export const FAKE_SCREEN_W = 1280
let dragFrom = 0.5

const MONITORS: MonitorInfo[] = [
  { index: 0, name: 'Monitor principal', width: 1920, height: 1080, primary: true },
  { index: 1, name: 'Monitor 2', width: 2560, height: 1440, primary: false },
]

export const mockBackend: Backend = {
  kind: 'mock',
  ...mockIntegrations,
  getSettings: () => Promise.resolve(settings),
  onSettingsChanged: (cb) => on('settings', (s) => cb(s as Settings)),
  setDisplayMode: (displayMode) => patch({ displayMode }),
  setPersona: (persona) => patch({ persona }),
  setDockSide: (dockSide) => patch({ dockSide }),
  setNames: (userName, assistantName) => patch({ userName, assistantName }),
  openSettings: noop,
  summon: () => {
    fire('summon', null)
    return Promise.resolve()
  },
  // The gallery listens to this to open its fake popover next to the orb.
  showPanelBesideOrb: () => {
    fire(MOCK_PANEL_EVENT, 'orb')
    return Promise.resolve()
  },
  setHitRect: noop,
  onHover: () => Promise.resolve(() => {}),
  onSummon: (cb) => on('summon', () => cb()),
  broadcast: (event, payload) => {
    fire(event, payload)
    return Promise.resolve()
  },
  listen: (event, cb) => on(event, (p) => cb(p as never)),
  setNotch: (notch) => patch({ notch }),
  setAppearance: (appearance) => patch({ appearance }),
  listMonitors: () => Promise.resolve(MONITORS),
  setMonitor: (monitor) => patch({ monitor }),
  notchDrag: (phase, dx) => {
    if (phase === 'start') dragFrom = settings.notch.offset
    const offset = Math.min(1, Math.max(0, dragFrom + dx / FAKE_SCREEN_W))
    return patch({ notch: { ...settings.notch, offset } })
  },
  getNotchAnchor: () => Promise.resolve(mockAnchor()),
  onNotchAnchor: (cb) => on('notch-anchor', (a) => cb(a as number)),
  onFocusChanged: (cb) => {
    const focus = () => cb(true)
    const blur = () => cb(false)
    window.addEventListener('focus', focus)
    window.addEventListener('blur', blur)
    return Promise.resolve(() => {
      window.removeEventListener('focus', focus)
      window.removeEventListener('blur', blur)
    })
  },
  focusSelf: noop,
  togglePalette: () => {
    fire(MOCK_PALETTE_EVENT, null)
    fire('palette-open', null)
    return Promise.resolve()
  },
  onPaletteOpen: (cb) => on('palette-open', () => cb()),
  openOnboarding: () => {
    fire(MOCK_ONBOARDING_EVENT, true)
    return Promise.resolve()
  },
  finishOnboarding: () => {
    fire(MOCK_ONBOARDING_EVENT, false)
    return patch({ onboarded: true })
  },
  showAlarm: (alarm) => {
    // Same rule as display/flows.rs: in notch mode the notch grows into the alarm card.
    if (settings.displayMode === 'notch') {
      fire('ekko://alarm/notch', alarm)
      return Promise.resolve()
    }
    pendingAlarm = alarm
    fire(MOCK_ALARM_EVENT, alarm)
    return Promise.resolve()
  },
  takeAlarm: <T>() => {
    const a = pendingAlarm as T | null
    pendingAlarm = null
    return Promise.resolve(a)
  },
  onAlarm: (cb) => on(MOCK_ALARM_EVENT, (a) => cb(a as never)),
  hideSelf: () => {
    fire(MOCK_HIDE_EVENT, null)
    return Promise.resolve()
  },
  startDragging: noop,
  ...mockTimers({ on, fire, showAlarm: (alarm) => mockBackend.showAlarm(alarm) }),
  ...mockMedia({ on, fire }),
  ...mockGeneral({
    general: () => settings.general,
    shortcuts: () => settings.shortcuts,
    patch,
  }),
  ...mockProductivity({ on, fire, showAlarm: (alarm) => mockBackend.showAlarm(alarm) }),
  ...mockSystem({ on, fire }),
  ...mockClipboard({ on, fire }),
  ...mockShelf({ on, fire }),
  ...mockHud({ on }),
  ...mockUpdate(),
  ...mockColor({ on, fire }),
  ...mockMail,
  ...mockWeather({ on, fire, weather: () => settings.weather, patch }),
  ...mockCapture({
    on,
    fire,
    shelve: async (name) => {
      const s = await mockBackend.shelfAdd([name])
      return s.items.find((i) => i.name === name)?.id ?? null
    },
  }),
}
