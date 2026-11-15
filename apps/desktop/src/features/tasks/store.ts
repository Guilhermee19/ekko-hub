import { create } from 'zustand'
import { dayAt, endOfDay } from './due'

// Feature-local mock store (F1b). The backend replaces it later with the same shape.

export type Priority = 'low' | 'normal' | 'high'
export type Repeat = 'daily' | 'weekly' | 'monthly'

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
}

interface TasksState {
  tasks: Task[]
  reminders: Reminder[]
  add: (task: NewTask) => void
  toggle: (id: string) => void
  remove: (id: string) => void
  setPriority: (id: string, priority: Priority) => void
  toggleSubtask: (taskId: string, subId: string) => void
  addSubtask: (taskId: string, title: string) => void
  addReminder: (text: string, at: number) => void
  removeReminder: (id: string) => void
}

let seq = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`

const now = Date.now()
const MIN = 60_000

const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Enviar relatório trimestral',
    done: false,
    priority: 'high',
    due: now - 45 * MIN,
    list: 'Trabalho',
    subtasks: [
      { id: 's1', title: 'Revisar números de vendas', done: true },
      { id: 's2', title: 'Montar os gráficos', done: true },
      { id: 's3', title: 'Enviar para a diretoria', done: false },
    ],
  },
  {
    id: 't2',
    title: 'Reunião de alinhamento com o time',
    done: false,
    priority: 'normal',
    due: now + 120 * MIN,
    list: 'Trabalho',
    repeat: 'weekly',
    subtasks: [],
  },
  {
    id: 't3',
    title: 'Comprar ração do gato',
    done: false,
    priority: 'normal',
    due: endOfDay(now),
    list: 'Casa',
    subtasks: [],
  },
  {
    id: 't4',
    title: 'Tomar vitamina D',
    done: false,
    priority: 'low',
    due: endOfDay(now),
    list: 'Pessoal',
    repeat: 'daily',
    subtasks: [],
  },
  {
    id: 't5',
    title: 'Faxina da semana',
    done: false,
    priority: 'low',
    due: dayAt(now, 10, 0, 1),
    list: 'Casa',
    repeat: 'weekly',
    subtasks: [
      { id: 's4', title: 'Lavar roupa', done: false },
      { id: 's5', title: 'Trocar roupa de cama', done: false },
    ],
  },
  {
    id: 't6',
    title: 'Pagar conta de luz',
    done: false,
    priority: 'high',
    due: dayAt(now, 18, 0, 3),
    list: 'Casa',
    repeat: 'monthly',
    subtasks: [],
  },
  {
    id: 't7',
    title: 'Responder e-mails do cliente',
    done: true,
    priority: 'normal',
    list: 'Trabalho',
    subtasks: [],
  },
  {
    id: 't8',
    title: 'Agendar dentista',
    done: true,
    priority: 'low',
    list: 'Pessoal',
    subtasks: [],
  },
]

const MOCK_REMINDERS: Reminder[] = [
  { id: 'r1', at: now + 30 * MIN, text: 'Ligar para a mãe' },
  { id: 'r2', at: dayAt(now, 21, 0), text: 'Tirar o lixo reciclável', repeat: 'weekly' },
  { id: 'r3', at: dayAt(now, 8, 0, 1), text: 'Levar o notebook para a assistência' },
]

const mapTask = (tasks: Task[], id: string, fn: (t: Task) => Task) =>
  tasks.map((t) => (t.id === id ? fn(t) : t))

export const useTasks = create<TasksState>((set) => ({
  tasks: MOCK_TASKS,
  reminders: MOCK_REMINDERS.sort((a, b) => a.at - b.at),
  add: ({ title, list = 'Pessoal', priority = 'normal', due }) =>
    set((s) => ({
      tasks: [
        { id: uid('t'), title: title.trim(), done: false, priority, due, list, subtasks: [] },
        ...s.tasks,
      ],
    })),
  toggle: (id) => set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, done: !t.done })) })),
  remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  setPriority: (id, priority) =>
    set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, priority })) })),
  toggleSubtask: (taskId, subId) =>
    set((s) => ({
      tasks: mapTask(s.tasks, taskId, (t) => ({
        ...t,
        subtasks: t.subtasks.map((st) => (st.id === subId ? { ...st, done: !st.done } : st)),
      })),
    })),
  addSubtask: (taskId, title) =>
    set((s) => ({
      tasks: mapTask(s.tasks, taskId, (t) => ({
        ...t,
        subtasks: [...t.subtasks, { id: uid('s'), title: title.trim(), done: false }],
      })),
    })),
  addReminder: (text, at) =>
    set((s) => ({
      reminders: [...s.reminders, { id: uid('r'), at, text: text.trim() }].sort(
        (a, b) => a.at - b.at,
      ),
    })),
  removeReminder: (id) => set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),
}))
