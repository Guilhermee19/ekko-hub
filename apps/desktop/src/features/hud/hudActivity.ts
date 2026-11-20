import type { HudEvent } from '@/lib/ipc'
import type { Activity } from '@/stores/assistant'

/** Battery news and system reactions, each with its own toggle in Aparência → Pílula. */
export type HudGroup = 'battery' | 'system'

export interface HudFlash {
  activity: Extract<Activity, { kind: 'hud' }>
  ms: number
  group: HudGroup
  /** Worth a sound (low battery). */
  alert?: boolean
}

/** Every flash leaves after this (counted from the last change). */
export const HUD_MS = 5000

/** What the pill shows for a system change; null when it is not worth a flash. */
export function hudFlash(e: HudEvent): HudFlash | null {
  switch (e.kind) {
    case 'capsLock':
      return system({
        kind: 'hud',
        icon: e.on ? 'caps' : 'capsOff',
        label: e.on ? 'Caps Lock ligado' : 'Caps Lock desligado',
      })
    case 'mic':
      return system(
        e.muted
          ? { kind: 'hud', icon: 'micOff', label: 'Microfone mudo', warn: true }
          : { kind: 'hud', icon: 'mic', label: 'Microfone ligado' },
      )
    case 'brightness':
      return system({ kind: 'hud', icon: 'brightness', label: 'Brilho', level: e.level / 100 })
    case 'power':
      // Only the start of charging is news; unplugging is not.
      if (!e.plugged) return null
      return {
        activity: { kind: 'hud', icon: 'charging', label: 'Carregando', level: e.percent / 100 },
        ms: HUD_MS,
        group: 'battery',
      }
    case 'lowBattery':
      return {
        activity: {
          kind: 'hud',
          icon: e.device ? 'headphones' : 'batteryLow',
          label: e.device
            ? `${e.device} com ${e.percent}% de bateria`
            : `Bateria fraca · ${e.percent}%. Ligue o carregador`,
          warn: true,
        },
        ms: HUD_MS,
        group: 'battery',
        alert: true,
      }
    case 'device':
      return system({
        kind: 'hud',
        icon: 'headphones',
        label: e.connected ? `${e.name} conectado · ${e.percent}%` : `${e.name} desconectado`,
      })
    case 'rest':
      // Only his eyes show it (see hudMood).
      return null
  }
}

const system = (activity: HudFlash['activity']): HudFlash => ({
  activity,
  ms: HUD_MS,
  group: 'system',
})
