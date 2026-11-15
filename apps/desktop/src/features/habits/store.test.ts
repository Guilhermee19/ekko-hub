import { beforeEach, describe, expect, it } from 'vitest'
import { streakOf, useHabits } from './store'

const initial = useHabits.getState()

describe('habits store', () => {
  beforeEach(() => useHabits.setState(initial, true))

  it('counts the streak ending today or yesterday', () => {
    expect(streakOf([true, true, false, true, true, true, false])).toBe(3)
    expect(streakOf([false, true, true, true, true, true, true])).toBe(6)
    expect(streakOf([true, false, false, false, false, false, false])).toBe(0)
  })

  it('check-in marks today done once the target is reached', () => {
    const { checkIn } = useHabits.getState()
    checkIn('reading')
    const h = useHabits.getState().habits.find((x) => x.id === 'reading')!
    expect(h.progress).toBe(20)
    expect(h.week.at(-1)).toBe(true)
    checkIn('reading')
    expect(useHabits.getState().habits.find((x) => x.id === 'reading')!.progress).toBe(20)
  })

  it('clamps water between 0 and twice the goal', () => {
    const { setWater, addWater } = useHabits.getState()
    setWater(0)
    addWater(-1)
    expect(useHabits.getState().water.count).toBe(0)
    setWater(99)
    expect(useHabits.getState().water.count).toBe(16)
  })
})
