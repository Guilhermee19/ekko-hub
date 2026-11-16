import {
  HABITS_CHANGED,
  TASKS_CHANGED,
  type HabitInfo,
  type HabitsSnapshot,
  type ProductivityBackend,
  type ReminderInfo,
  type Repeat,
  type TaskInfo,
  type TasksSnapshot,
} from './productivityTypes'
import type { Unlisten } from './types'

// In-memory port of crates/ekko-core tasks + habits, for the browser gallery.

interface Deps {
  on: (event: string, cb: (payload: unknown) => void) => Promise<Unlisten>
  fire: (event: string, payload: unknown) => void
  showAlarm: (alarm: unknown) => Promise<void>
}

const NOTIFY_EVENT = 'ekko://notify'
const DAY = 86_400_000
let seq = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(16)}-${++seq}`

/** Same local time one period later (month day clamped, like the Rust side). */
export function stepRepeat(repeat: Repeat, at: number): number {
  if (repeat === 'daily') return at + DAY
  if (repeat === 'weekly') return at + 7 * DAY
  const d = new Date(at)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return d.getTime()
}

function nextAfter(repeat: Repeat, at: number, now: number): number {
  let next = stepRepeat(repeat, at)
  while (next <= now) next = stepRepeat(repeat, next)
  return next
}

const dayKey = (t: number) => {
  const d = new Date(t)
  return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate()
}

const habit = (
  id: string,
  label: string,
  icon: HabitInfo['icon'],
  unit: HabitInfo['unit'],
  target: number,
  step: number,
): HabitInfo => ({ id, label, icon, unit, target, progress: 0, step, week: Array(7).fill(false) })

export const DEFAULT_HABITS: HabitsSnapshot = {
  water: { count: 0, goal: 8 },
  habits: [
    habit('reading', 'Leitura', 'book', 'min', 20, 10),
    habit('exercise', 'Exercício', 'dumbbell', 'min', 30, 15),
    habit('eyes', 'Pausas para os olhos', 'eye', 'x', 6, 1),
    habit('stretch', 'Alongar', 'stretch', 'x', 3, 1),
  ],
}

const withProgress = (h: HabitInfo, progress: number): HabitInfo => {
  const p = Math.min(h.target, Math.max(0, progress))
  return { ...h, progress: p, week: [...h.week.slice(0, -1), p >= h.target] }
}

export function mockProductivity({ on, fire, showAlarm }: Deps): ProductivityBackend {
  let tasks: TasksSnapshot = { tasks: [], reminders: [] }
  let habits: HabitsSnapshot = DEFAULT_HABITS
  let day = dayKey(Date.now())
  let ticking = false

  const commitTasks = (next: TasksSnapshot) => {
    tasks = { ...next, reminders: [...next.reminders].sort((a, b) => a.atMs - b.atMs) }
    fire(TASKS_CHANGED, tasks)
    return Promise.resolve(tasks)
  }
  const mapTask = (id: string, fn: (t: TaskInfo) => TaskInfo) =>
    commitTasks({ ...tasks, tasks: tasks.tasks.map((t) => (t.id === id ? fn(t) : t)) })

  // Midnight rollover: new day, empty progress, history shifted by one.
  const rolled = (): HabitsSnapshot => {
    const today = dayKey(Date.now())
    if (today === day) return habits
    day = today
    return {
      water: { ...habits.water, count: 0 },
      habits: habits.habits.map((h) => ({ ...h, progress: 0, week: [...h.week.slice(1), false] })),
    }
  }
  const commitHabits = (fn: (s: HabitsSnapshot) => HabitsSnapshot) => {
    habits = fn(rolled())
    fire(HABITS_CHANGED, habits)
    return Promise.resolve(habits)
  }
  const mapHabit = (id: string, fn: (h: HabitInfo) => HabitInfo) =>
    commitHabits((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? fn(h) : h)) }))
  const setWater = (count: (current: number) => number) =>
    commitHabits((s) => {
      const next = Math.round(count(s.water.count))
      return { ...s, water: { ...s.water, count: Math.min(s.water.goal * 2, Math.max(0, next)) } }
    })

  const fireReminder = (r: ReminderInfo, now: number) => {
    const time = new Date(r.atMs).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const detail = `Lembrete das ${time}`
    fire(NOTIFY_EVENT, { kind: 'reminder', title: r.text, body: detail })
    void showAlarm({ id: `${r.id}-${now}`, kind: 'reminder', title: r.text, detail, firedAt: now })
  }

  // Lazy so importing the mock (tests) never leaves an interval behind.
  const ensureTicking = () => {
    if (ticking) return
    ticking = true
    globalThis.setInterval(() => {
      const now = Date.now()
      const due = tasks.reminders.filter((r) => r.atMs <= now)
      if (due.length) {
        const reminders = tasks.reminders.flatMap((r) => {
          if (r.atMs > now) return [r]
          return r.repeat ? [{ ...r, atMs: nextAfter(r.repeat, r.atMs, now) }] : []
        })
        void commitTasks({ ...tasks, reminders })
        due.forEach((r) => fireReminder(r, now))
      }
      if (dayKey(now) !== day) void commitHabits((s) => s)
    }, 1000)
  }

  return {
    listTasks: () => {
      ensureTicking()
      return Promise.resolve(tasks)
    },
    onTasksChanged: (cb) => on(TASKS_CHANGED, (s) => cb(s as TasksSnapshot)),
    taskAdd: ({ title, list, priority, dueMs, repeat }) => {
      if (!title.trim()) return Promise.resolve(tasks)
      const task: TaskInfo = {
        id: uid('t'),
        title: title.trim(),
        done: false,
        priority: priority ?? 'normal',
        list: list?.trim() || 'Pessoal',
        subtasks: [],
        ...(dueMs !== undefined && { dueMs }),
        ...(repeat && { repeat }),
      }
      return commitTasks({ ...tasks, tasks: [task, ...tasks.tasks] })
    },
    taskToggle: (id) =>
      mapTask(id, (t) => {
        if (t.done || !t.repeat) return { ...t, done: !t.done }
        const now = Date.now()
        const dueMs = nextAfter(t.repeat, t.dueMs ?? now, now)
        return { ...t, dueMs, subtasks: t.subtasks.map((s) => ({ ...s, done: false })) }
      }),
    taskRemove: (id) => commitTasks({ ...tasks, tasks: tasks.tasks.filter((t) => t.id !== id) }),
    taskSetPriority: (id, priority) => mapTask(id, (t) => ({ ...t, priority })),
    subtaskAdd: (taskId, title) =>
      title.trim()
        ? mapTask(taskId, (t) => ({
            ...t,
            subtasks: [...t.subtasks, { id: uid('s'), title: title.trim(), done: false }],
          }))
        : Promise.resolve(tasks),
    subtaskToggle: (taskId, subId) =>
      mapTask(taskId, (t) => ({
        ...t,
        subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)),
      })),
    reminderAdd: (text, atMs, repeat) => {
      ensureTicking()
      if (!text.trim()) return Promise.resolve(tasks)
      const r: ReminderInfo = { id: uid('r'), atMs, text: text.trim(), ...(repeat && { repeat }) }
      return commitTasks({ ...tasks, reminders: [...tasks.reminders, r] })
    },
    reminderRemove: (id) =>
      commitTasks({ ...tasks, reminders: tasks.reminders.filter((r) => r.id !== id) }),
    listHabits: () => {
      ensureTicking()
      habits = rolled()
      return Promise.resolve(habits)
    },
    onHabitsChanged: (cb) => on(HABITS_CHANGED, (s) => cb(s as HabitsSnapshot)),
    waterAdd: (delta) => setWater((c) => c + delta),
    waterSet: (count) => setWater(() => count),
    habitCheckIn: (id) => mapHabit(id, (h) => withProgress(h, h.progress + h.step)),
    habitUndo: (id) => mapHabit(id, (h) => withProgress(h, h.progress - h.step)),
  }
}
