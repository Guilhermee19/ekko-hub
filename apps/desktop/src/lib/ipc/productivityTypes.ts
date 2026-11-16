import type { Unlisten } from './types'

// Mirrors crates/ekko-core (tasks.rs, habits.rs) + commands/productivity.rs.

export const TASKS_CHANGED = 'ekko://tasks/changed'
export const HABITS_CHANGED = 'ekko://habits/changed'

export type Priority = 'low' | 'normal' | 'high'
export type Repeat = 'daily' | 'weekly' | 'monthly'

export interface SubtaskInfo {
  id: string
  title: string
  done: boolean
}

export interface TaskInfo {
  id: string
  title: string
  done: boolean
  priority: Priority
  /** Epoch ms; absent when undated. */
  dueMs?: number
  list: string
  repeat?: Repeat
  subtasks: SubtaskInfo[]
}

export interface ReminderInfo {
  id: string
  /** Epoch ms. */
  atMs: number
  text: string
  repeat?: Repeat
}

export interface NewTaskInfo {
  title: string
  list?: string
  priority?: Priority
  dueMs?: number
  repeat?: Repeat
}

/** Reminders come sorted by time. */
export interface TasksSnapshot {
  tasks: TaskInfo[]
  reminders: ReminderInfo[]
}

export type HabitIcon = 'book' | 'dumbbell' | 'eye' | 'stretch'

export interface HabitInfo {
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

export interface WaterInfo {
  count: number
  goal: number
}

export interface HabitsSnapshot {
  water: WaterInfo
  habits: HabitInfo[]
}

/** Tasks, reminders, water and habits live in the backend; every call returns the
 * new snapshot (also broadcast to every window). */
export interface ProductivityBackend {
  listTasks(): Promise<TasksSnapshot>
  onTasksChanged(cb: (snapshot: TasksSnapshot) => void): Promise<Unlisten>
  taskAdd(task: NewTaskInfo): Promise<TasksSnapshot>
  /** Completing a repeating task moves it to its next occurrence. */
  taskToggle(id: string): Promise<TasksSnapshot>
  taskRemove(id: string): Promise<TasksSnapshot>
  taskSetPriority(id: string, priority: Priority): Promise<TasksSnapshot>
  subtaskAdd(taskId: string, title: string): Promise<TasksSnapshot>
  subtaskToggle(taskId: string, subId: string): Promise<TasksSnapshot>
  reminderAdd(text: string, atMs: number, repeat?: Repeat): Promise<TasksSnapshot>
  reminderRemove(id: string): Promise<TasksSnapshot>
  listHabits(): Promise<HabitsSnapshot>
  onHabitsChanged(cb: (snapshot: HabitsSnapshot) => void): Promise<Unlisten>
  /** Cups are clamped to [0, goal * 2]. */
  waterAdd(delta: number): Promise<HabitsSnapshot>
  waterSet(count: number): Promise<HabitsSnapshot>
  habitCheckIn(id: string): Promise<HabitsSnapshot>
  habitUndo(id: string): Promise<HabitsSnapshot>
}
