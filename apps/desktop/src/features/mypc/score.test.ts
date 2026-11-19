import { describe, expect, it } from 'vitest'
import type { ScanCheck } from '@/lib/ipc'
import { freeableBytes, scanGrade, scanScore, statusCounts } from './score'
import type { ScanStep } from './store'

const step = (id: string, status: ScanStep['status'], action?: ScanCheck['action']): ScanStep => ({
  id,
  label: id,
  status,
  check: action
    ? { id, label: id, status: 'info', finding: '', value: null, bytes: null, items: [], action }
    : undefined,
})

describe('scan score', () => {
  it('is null until a step finishes and ignores running/pending ones', () => {
    expect(scanScore([step('a', 'running'), step('b', 'pending')])).toBeNull()
    expect(scanScore([step('a', 'ok'), step('b', 'running')])).toBe(100)
  })

  it('weighs warnings more than info', () => {
    expect(scanScore([step('a', 'ok'), step('b', 'warn')])).toBe(73)
    expect(scanScore([step('a', 'ok'), step('b', 'info')])).toBe(93)
  })

  it('grades the score', () => {
    expect(scanGrade(100)).toBe('good')
    expect(scanGrade(73)).toBe('fair')
    expect(scanGrade(45)).toBe('bad')
  })

  it('adds up what the pending cleanups would free', () => {
    const steps = [
      step('temp', 'warn', { kind: 'cleanTemp', bytes: 100 }),
      step('bin', 'info', { kind: 'emptyRecycleBin', bytes: 50 }),
      step('startup', 'info', { kind: 'openStartup' }),
    ]
    expect(freeableBytes(steps, [])).toBe(150)
    expect(freeableBytes(steps, ['temp'])).toBe(50)
    expect(statusCounts(steps)).toEqual({ ok: 0, warn: 1, info: 2 })
  })
})
