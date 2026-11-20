import type { Unlisten } from './types'

// Mirrors crates/ekko-core/src/hud.rs + services/system_hud.rs.

export const HUD_EVENT = 'ekko://hud'
export const POWER_CHANGED = 'ekko://power/changed'

export interface Battery {
  percent: number
  /** On the charger (it may be full and not charging). */
  plugged: boolean
}

export type DeviceKind = 'headphones' | 'keyboard' | 'mouse' | 'phone' | 'gamepad' | 'other'

export interface DeviceBattery {
  name: string
  percent: number
  kind: DeviceKind
}

export interface PowerSnapshot {
  /** null on desktops. */
  battery: Battery | null
  /** Connected Bluetooth devices that report a battery. */
  devices: DeviceBattery[]
}

/** Something changed on the PC; the notch flashes it. */
export type HudEvent =
  | { kind: 'capsLock'; on: boolean }
  | { kind: 'mic'; muted: boolean }
  | { kind: 'brightness'; level: number }
  | { kind: 'power'; plugged: boolean; percent: number }
  | { kind: 'lowBattery'; device: string | null; percent: number }
  | { kind: 'device'; name: string; percent: number; connected: boolean }
  /** The PC was left alone for a while (Ekko gets sleepy), or someone came back. */
  | { kind: 'rest'; level: 'awake' | 'drowsy' | 'asleep' }

export interface HudBackend {
  powerSnapshot(): Promise<PowerSnapshot>
  onPower(cb: (p: PowerSnapshot) => void): Promise<Unlisten>
  onHud(cb: (e: HudEvent) => void): Promise<Unlisten>
}
