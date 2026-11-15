import { create } from 'zustand'

// Feature-local mock store (F1b). The backend replaces it later with the same shape.

export type HabitIcon = 'book' | 'dumbbell' | 'eye' | 'stretch'

export interface Habit {
  id: string
  label: string
  icon: HabitIcon
  /** Unit for target/progress: minutes or repetitions. */
  unit: 'min' | 'x'
  /** Daily goal. */
  target: number
  /** Today's progress, same unit as target. */
  progress: number
  /** Added per check-in. */
  step: number
  /** Last 7 days, oldest first; the last entry is today. */
  week: boolean[]
}

export interface Water {
  count: number
  goal: number
}

interface HabitsState {
  water: Water
  habits: Habit[]
  /** +1 / -1 cup, clamped to [0, goal * 2]. */
  addWater: (delta: number) => void
  setWater: (count: number) => void
  checkIn: (id: string) => void
  undo: (id: string) => void
}

const MOCK_HABITS: Habit[] = [
  {
    id: 'reading',
    label: 'Leitura',
    icon: 'book',
    unit: 'min',
    target: 20,
    progress: 10,
    step: 10,
    week: [true, true, false, true, true, true, false],
  },
  {
    id: 'exercise',
    label: 'Exercício',
    icon: 'dumbbell',
    unit: 'min',
    target: 30,
    progress: 0,
    step: 15,
    week: [true, false, true, false, true, false, false],
  },
  {
    id: 'eyes',
    label: 'Pausas para os olhos',
    icon: 'eye',
    unit: 'x',
    target: 6,
    progress: 4,
    step: 1,
    week: [true, true, true, true, false, true, false],
  },
  {
    id: 'stretch',
    label: 'Alongar',
    icon: 'stretch',
    unit: 'x',
    target: 3,
    progress: 3,
    step: 1,
    week: [false, true, true, true, true, true, true],
  },
]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Update today's progress and keep the last streak entry in sync. */
function withProgress(h: Habit, progress: number): Habit {
  const p = clamp(progress, 0, h.target)
  return { ...h, progress: p, week: [...h.week.slice(0, -1), p >= h.target] }
}

const patch = (habits: Habit[], id: string, fn: (h: Habit) => Habit) =>
  habits.map((h) => (h.id === id ? fn(h) : h))

export const useHabits = create<HabitsState>((set) => ({
  water: { count: 5, goal: 8 },
  habits: MOCK_HABITS,
  addWater: (delta) =>
    set((s) => ({
      water: { ...s.water, count: clamp(s.water.count + delta, 0, s.water.goal * 2) },
    })),
  setWater: (count) =>
    set((s) => ({ water: { ...s.water, count: clamp(count, 0, s.water.goal * 2) } })),
  checkIn: (id) =>
    set((s) => ({ habits: patch(s.habits, id, (h) => withProgress(h, h.progress + h.step)) })),
  undo: (id) =>
    set((s) => ({ habits: patch(s.habits, id, (h) => withProgress(h, h.progress - h.step)) })),
}))

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
