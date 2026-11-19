import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  HUD_EVENT,
  POWER_CHANGED,
  type HudBackend,
  type HudEvent,
  type PowerSnapshot,
} from './hudTypes'

export const tauriHud: HudBackend = {
  powerSnapshot: () => invoke('power_snapshot'),
  onPower: (cb) => listen<PowerSnapshot>(POWER_CHANGED, (e) => cb(e.payload)),
  onHud: (cb) => listen<HudEvent>(HUD_EVENT, (e) => cb(e.payload)),
}
