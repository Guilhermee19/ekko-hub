import {
  HUD_EVENT,
  POWER_CHANGED,
  type HudBackend,
  type HudEvent,
  type PowerSnapshot,
} from './hudTypes'
import type { Unlisten } from './types'

// Browser gallery: a laptop on battery with a headset, and the real Caps Lock key
// of the browser, so the notch's reactions can be tried without Tauri.

interface Bus {
  on: (event: string, cb: (payload: unknown) => void) => Promise<Unlisten>
}

const SNAPSHOT: PowerSnapshot = {
  battery: { percent: 76, plugged: false },
  devices: [
    { name: 'Fone Bluetooth', percent: 60, kind: 'headphones', charging: false },
    { name: 'Mouse', percent: 15, kind: 'mouse', charging: true },
  ],
}

export function mockHud({ on }: Bus): HudBackend {
  return {
    powerSnapshot: () => Promise.resolve(SNAPSHOT),
    onPower: (cb) => on(POWER_CHANGED, (p) => cb(p as PowerSnapshot)),
    onHud: (cb) => {
      const off = on(HUD_EVENT, (e) => cb(e as HudEvent))
      const caps = (e: KeyboardEvent) => {
        if (e.key === 'CapsLock') cb({ kind: 'capsLock', on: e.getModifierState('CapsLock') })
      }
      window.addEventListener('keyup', caps)
      return off.then((f) => () => {
        f()
        window.removeEventListener('keyup', caps)
      })
    },
  }
}
