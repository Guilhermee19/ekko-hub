import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  HABITS_CHANGED,
  TASKS_CHANGED,
  type HabitsSnapshot,
  type ProductivityBackend,
  type TasksSnapshot,
} from './productivityTypes'

export const tauriProductivity: ProductivityBackend = {
  listTasks: () => invoke('list_tasks'),
  onTasksChanged: (cb) => listen<TasksSnapshot>(TASKS_CHANGED, (e) => cb(e.payload)),
  taskAdd: (task) => invoke('task_add', { task }),
  taskToggle: (id) => invoke('task_toggle', { id }),
  taskRemove: (id) => invoke('task_remove', { id }),
  taskSetPriority: (id, priority) => invoke('task_set_priority', { id, priority }),
  subtaskAdd: (taskId, title) => invoke('subtask_add', { taskId, title }),
  subtaskToggle: (taskId, subId) => invoke('subtask_toggle', { taskId, subId }),
  reminderAdd: (text, atMs, repeat) =>
    invoke('reminder_add', { text, atMs: Math.round(atMs), repeat: repeat ?? null }),
  reminderRemove: (id) => invoke('reminder_remove', { id }),
  listHabits: () => invoke('list_habits'),
  onHabitsChanged: (cb) => listen<HabitsSnapshot>(HABITS_CHANGED, (e) => cb(e.payload)),
  waterAdd: (delta) => invoke('water_add', { delta }),
  waterSet: (count) => invoke('water_set', { count: Math.max(0, Math.round(count)) }),
  habitCheckIn: (id) => invoke('habit_check_in', { id }),
  habitUndo: (id) => invoke('habit_undo', { id }),
}
