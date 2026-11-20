import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE, useAssistant } from '@/stores/assistant'
import { flashActivity } from './flash'

describe('flashActivity', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAssistant.setState(IDLE)
  })
  afterEach(() => vi.useRealTimers())

  it('goes back to what was there, even when the store holds a copy', () => {
    const timer = { kind: 'timer', label: '5 min', endsAt: 1, total: 300 } as const
    useAssistant.setState({ activity: timer })
    flashActivity({ kind: 'volume', level: 0.4 }, 5000)
    // The broadcast echo replaces the object with an equal copy.
    useAssistant.setState({ activity: { kind: 'volume', level: 0.4 } })
    vi.advanceTimersByTime(4900)
    expect(useAssistant.getState().activity?.kind).toBe('volume')
    vi.advanceTimersByTime(200)
    expect(useAssistant.getState().activity).toEqual(timer)
  })

  it('counts the time from the last change', () => {
    flashActivity({ kind: 'volume', level: 0.4 }, 5000)
    vi.advanceTimersByTime(3000)
    flashActivity({ kind: 'volume', level: 0.5 }, 5000)
    vi.advanceTimersByTime(3000)
    expect(useAssistant.getState().activity).toEqual({ kind: 'volume', level: 0.5 })
    vi.advanceTimersByTime(2100)
    expect(useAssistant.getState().activity).toBeNull()
  })

  it('never goes back to another flash', () => {
    // Another window flashed first; ours must not restore it when it leaves.
    useAssistant.setState({ activity: { kind: 'hud', icon: 'caps', label: 'Caps Lock ligado' } })
    vi.advanceTimersByTime(1000)
    flashActivity({ kind: 'hud', icon: 'capsOff', label: 'Caps Lock desligado' }, 5000)
    vi.advanceTimersByTime(5100)
    expect(useAssistant.getState().activity).toBeNull()
  })

  it('clears a flash that arrives late, with no timer running here', () => {
    flashActivity({ kind: 'volume', level: 0.4 }, 5000)
    vi.advanceTimersByTime(5100)
    expect(useAssistant.getState().activity).toBeNull()
    // Late echo of an older broadcast.
    useAssistant.setState({ activity: { kind: 'hud', icon: 'caps', label: 'Caps Lock ligado' } })
    vi.advanceTimersByTime(5100)
    expect(useAssistant.getState().activity).toBeNull()
  })
})
