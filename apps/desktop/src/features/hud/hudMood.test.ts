import { expect, it } from 'vitest'
import { hudMood } from './hudMood'

it('good news cheer Ekko up, scares make him jump, the rest leaves him be', () => {
  expect(hudMood({ kind: 'power', plugged: true, percent: 50 })).toBe('excited')
  expect(hudMood({ kind: 'device', name: 'Fone', percent: 80, connected: true })).toBe('excited')
  expect(hudMood({ kind: 'lowBattery', device: null, percent: 9 })).toBe('startled')
  expect(hudMood({ kind: 'capsLock', on: true })).toBe('startled')
  expect(hudMood({ kind: 'capsLock', on: false })).toBeNull()
  expect(hudMood({ kind: 'power', plugged: false, percent: 50 })).toBeNull()
  expect(hudMood({ kind: 'brightness', level: 40 })).toBeNull()
  expect(hudMood({ kind: 'rest', level: 'asleep' })).toBeNull()
})
