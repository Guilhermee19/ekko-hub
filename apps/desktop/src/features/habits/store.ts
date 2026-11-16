import { create } from 'zustand'
import { backend, type HabitInfo, type HabitsSnapshot, type WaterInfo } from '@/lib/ipc'

// Water and habits live in the backend (Rust in Tauri, `mockProductivity` in the
// gallery), which also rolls them over at local midnight. This store mirrors it.

export type { HabitIcon } from '@/lib/ipc'
export type Habit = HabitInfo
export type Water = WaterInfo

interface HabitsState {
  water: Water
  habits: Habit[]
  /** +1 / -1 cup, clamped to [0, goal * 2] by the backend. */
  addWater: (delta: number) => Promise<void>
  setWater: (count: number) => Promise<void>
  checkIn: (id: string) => Promise<void>
  undo: (id: string) => Promise<void>
}

export const useHabits = create<HabitsState>((set) => {
  const run = (call: Promise<HabitsSnapshot>) =>
    call.then(
      (s) => set(s),
      (err: unknown) => console.error('[ekko] hábitos:', err),
    )

  return {
    water: { count: 0, goal: 8 },
    habits: [],
    addWater: (delta) => run(backend.waterAdd(delta)),
    setWater: (count) => run(backend.waterSet(count)),
    checkIn: (id) => run(backend.habitCheckIn(id)),
    undo: (id) => run(backend.habitUndo(id)),
  }
})

/** Consecutive done days ending today (or yesterday, if today is still open). */
export function streakOf(week: boolean[]): number {
  let i = week.length - 1
  if (!week[i]) i--
  let n = 0
  while (i >= 0 && week[i]) {
    n++
    i--
  }
  return n
}

// Sync with the backend once per window: initial snapshot, then every change.
void backend
  .listHabits()
  .then((s) => useHabits.setState(s))
  .catch((err: unknown) => console.error('[ekko] hábitos:', err))
void backend.onHabitsChanged((s) => useHabits.setState(s))
