import { describe, expect, it } from 'vitest'
import { HUD_MS, hudFlash } from './hudActivity'

describe('hud flash', () => {
  it('names each system change in pt-BR and leaves after 5 s', () => {
    expect(hudFlash({ kind: 'capsLock', on: true })).toMatchObject({
      activity: { label: 'Caps Lock ligado' },
      ms: HUD_MS,
      group: 'system',
    })
    expect(hudFlash({ kind: 'mic', muted: true })?.activity).toMatchObject({
      icon: 'micOff',
      warn: true,
    })
    expect(hudFlash({ kind: 'brightness', level: 40 })?.activity.level).toBe(0.4)
    expect(HUD_MS).toBe(5000)
  })

  it('battery shows when charging starts, not when unplugged', () => {
    expect(hudFlash({ kind: 'power', plugged: true, percent: 80 })).toMatchObject({
      activity: { icon: 'charging', level: 0.8 },
      group: 'battery',
    })
    expect(hudFlash({ kind: 'power', plugged: false, percent: 80 })).toBeNull()
  })

  it('low battery is a battery warning with a sound', () => {
    const laptop = hudFlash({ kind: 'lowBattery', device: null, percent: 9 })
    expect(laptop).toMatchObject({ alert: true, group: 'battery' })
    expect(laptop?.activity.icon).toBe('batteryLow')
    const buds = hudFlash({ kind: 'lowBattery', device: 'Fone', percent: 10 })
    expect(buds?.activity.label).toBe('Fone com 10% de bateria')
  })

  it('headsets say when they come and go', () => {
    const on = hudFlash({ kind: 'device', name: 'Fone', percent: 60, connected: true })
    expect(on?.activity.label).toBe('Fone conectado · 60%')
    const off = hudFlash({ kind: 'device', name: 'Fone', percent: 60, connected: false })
    expect(off?.activity.label).toBe('Fone desconectado')
  })
})
