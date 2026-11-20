import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BURST_MS, feel, moodOf, setRest, useMood } from './mood'

const mood = () => moodOf(useMood.getState())

describe('mood', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useMood.setState({ rest: 'awake', burst: null, beat: 0 })
  })
  afterEach(() => vi.useRealTimers())

  it('gets sleepy with the PC left alone and a reaction wins while it lasts', () => {
    expect(mood()).toBe('calm')
    setRest('drowsy')
    expect(mood()).toBe('drowsy')
    feel('excited')
    expect(mood()).toBe('excited')
    vi.advanceTimersByTime(BURST_MS.excited + 10)
    expect(mood()).toBe('drowsy')
  })

  it('wakes up with a start, but only from real sleep', () => {
    setRest('drowsy')
    setRest('awake')
    expect(mood()).toBe('calm')
    setRest('asleep')
    setRest('awake')
    expect(mood()).toBe('startled')
    vi.advanceTimersByTime(BURST_MS.startled + 10)
    expect(mood()).toBe('calm')
  })

  it('the same reaction twice in a row plays again', () => {
    feel('excited')
    const first = useMood.getState().beat
    vi.advanceTimersByTime(1000)
    feel('excited')
    expect(useMood.getState().beat).toBe(first + 1)
    // The time counts from the last one.
    vi.advanceTimersByTime(BURST_MS.excited - 100)
    expect(mood()).toBe('excited')
  })
})
