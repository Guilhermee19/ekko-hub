import type { HudEvent } from '@/lib/ipc'
import type { Burst } from '@/stores/mood'

/** How Ekko reacts to a system change; null when it does not move him. */
export function hudMood(e: HudEvent): Burst | null {
  switch (e.kind) {
    case 'power':
      return e.plugged ? 'excited' : null
    case 'device':
      return e.connected ? 'excited' : null
    case 'lowBattery':
      return 'startled'
    // Caps Lock on is usually an accident.
    case 'capsLock':
      return e.on ? 'startled' : null
    default:
      return null
  }
}
