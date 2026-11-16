import { describe, expect, it } from 'vitest'
import { streakOf, useHabits } from './store'

describe('habits store', () => {
  it('counts the streak ending today or yesterday', () => {
    expect(streakOf([true, true, false, true, true, true, false])).toBe(3)
    expect(streakOf([false, true, true, true, true, true, true])).toBe(6)
    expect(streakOf([true, false, false, false, false, false, false])).toBe(0)
  })

  it('mirrors the backend after each action', async () => {
    const { checkIn, setWater, addWater } = useHabits.getState()
    await checkIn('reading')
    await checkIn('reading')
    const h = useHabits.getState().habits.find((x) => x.id === 'reading')!
    expect(h.progress).toBe(20)
    expect(h.week.at(-1)).toBe(true)
    await setWater(99)
    expect(useHabits.getState().water.count).toBe(16)
    await setWater(0)
    await addWater(-1)
    expect(useHabits.getState().water.count).toBe(0)
  })
})
