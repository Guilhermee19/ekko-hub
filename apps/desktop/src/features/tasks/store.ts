import { create } from 'zustand'
import { backend, type Priority, type Repeat, type TasksSnapshot } from '@/lib/ipc'

// Tasks and reminders live in the backend (Rust in Tauri, `mockProductivity` in the
// gallery); this store mirrors its snapshot in every window.

export type { Priority, Repeat }

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  done: boolean
  priority: Priority
  /** Epoch ms. */
  due?: number
  list: string
  repeat?: Repeat
  subtasks: Subtask[]
}

export interface Reminder {
  id: string
  /** Epoch ms. */
  at: number
  text: string
  repeat?: Repeat
}

export interface NewTask {
  title: string
  list?: string
  priority?: Priority
  due?: number
  repeat?: Repeat
}

interface TasksState {
  tasks: Task[]
  reminders: Reminder[]
  add: (task: NewTask) => Promise<void>
  /** Completing a repeating task moves it to its next occurrence. */
  toggle: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  setPriority: (id: string, priority: Priority) => Promise<void>
  toggleSubtask: (taskId: string, subId: string) => Promise<void>
  addSubtask: (taskId: string, title: string) => Promise<void>
  addReminder: (text: string, at: number, repeat?: Repeat) => Promise<void>
  removeReminder: (id: string) => Promise<void>
}

/** Backend snapshot → the shape the UI (Home, badges) already uses. */
export function fromSnapshot(s: TasksSnapshot): Pick<TasksState, 'tasks' | 'reminders'> {
  return {
    tasks: s.tasks.map(({ dueMs, ...t }) => ({ ...t, ...(dueMs !== undefined && { due: dueMs }) })),
    reminders: s.reminders.map(({ atMs, ...r }) => ({ ...r, at: atMs })),
  }
}

export const useTasks = create<TasksState>((set) => {
  const run = (call: Promise<TasksSnapshot>) =>
    call.then(
      (s) => set(fromSnapshot(s)),
      (err: unknown) => console.error('[ekko] tarefas:', err),
    )

  return {
    tasks: [],
    reminders: [],
    add: ({ due, ...task }) => run(backend.taskAdd({ ...task, dueMs: due })),
    toggle: (id) => run(backend.taskToggle(id)),
    remove: (id) => run(backend.taskRemove(id)),
    setPriority: (id, priority) => run(backend.taskSetPriority(id, priority)),
    toggleSubtask: (taskId, subId) => run(backend.subtaskToggle(taskId, subId)),
    addSubtask: (taskId, title) => run(backend.subtaskAdd(taskId, title)),
    addReminder: (text, at, repeat) => run(backend.reminderAdd(text, at, repeat)),
    removeReminder: (id) => run(backend.reminderRemove(id)),
  }
})

// Sync with the backend once per window: initial snapshot, then every change.
void backend
  .listTasks()
  .then((s) => useTasks.setState(fromSnapshot(s)))
  .catch((err: unknown) => console.error('[ekko] tarefas:', err))
void backend.onTasksChanged((s) => useTasks.setState(fromSnapshot(s)))
