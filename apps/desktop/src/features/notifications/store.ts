import { create } from 'zustand'
import { backend } from '@/lib/ipc'
import { useAssistant } from '@/stores/assistant'

// Mock notification center (F1c). From F4 on the backend pushes items with this shape.

export type NotificationKind = 'reminder' | 'timer' | 'habit' | 'system'

export interface Notification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  /** Epoch ms. */
  at: number
  read: boolean
}

export type NewNotification = Pick<Notification, 'kind' | 'title' | 'body'> &
  Partial<Pick<Notification, 'at'>>

interface NotificationsState {
  items: Notification[]
  /** Adds to the center and flashes the title in the notch pill. */
  notify: (item: NewNotification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  remove: (id: string) => void
  clear: () => void
}

let seq = 0
const uid = () => `nt-${Date.now().toString(36)}-${(seq++).toString(36)}`

const MIN = 60_000
const HOUR = 60 * MIN

function seed(now: number): Notification[] {
  return [
    {
      id: 'n1',
      kind: 'timer',
      title: 'Timer "Café passando" terminou',
      body: '5 minutos. Bom café!',
      at: now - 12 * MIN,
      read: false,
    },
    {
      id: 'n2',
      kind: 'habit',
      title: 'Hora de beber água',
      body: 'Você está em 5 de 8 copos hoje.',
      at: now - 48 * MIN,
      read: false,
    },
    {
      id: 'n3',
      kind: 'reminder',
      title: 'Ligar para o cliente',
      body: 'Lembrete das 10:00.',
      at: now - 3 * HOUR,
      read: true,
    },
    {
      id: 'n4',
      kind: 'system',
      title: 'Memória do PC em 87%',
      body: 'O Chrome está usando 2,1 GB. Quer que eu feche abas?',
      at: now - 26 * HOUR,
      read: true,
    },
    {
      id: 'n5',
      kind: 'reminder',
      title: 'Pagar a conta de luz',
      body: 'Vence amanhã.',
      at: now - 2 * 24 * HOUR,
      read: false,
    },
  ]
}

export const useNotifications = create<NotificationsState>((set) => ({
  items: seed(Date.now()),
  notify: (item) => {
    const full: Notification = { at: Date.now(), ...item, id: uid(), read: false }
    set((s) => ({ items: [full, ...s.items] }))
    useAssistant.getState().set({ toast: full.title })
  },
  markRead: (id) =>
    set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: () => set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
  remove: (id) => set((s) => ({ items: s.items.filter((n) => n.id !== id) })),
  clear: () => set({ items: [] }),
}))

/** Unread count for badges (nav item, notch dot). */
export const selectUnread = (s: { items: Notification[] }) =>
  s.items.reduce((n, x) => n + (x.read ? 0 : 1), 0)

// Backend-fired entries (timers ending, later reminders): every window adds its copy.
void backend.listen<NewNotification>('ekko://notify', (n) => useNotifications.getState().notify(n))
