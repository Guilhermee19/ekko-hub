import { create } from 'zustand'
import { backend } from '@/lib/ipc'
import { alertSound } from '@/lib/notifySound'
import { useAssistant } from '@/stores/assistant'
import { useSettings } from '@/stores/settings'

// Notification center. Backend-fired entries (timers, reminders) arrive on `ekko://notify`;
// the list lives in each window's memory (not persisted yet).

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

export const useNotifications = create<NotificationsState>((set) => ({
  items: [],
  notify: (item) => {
    const full: Notification = { at: Date.now(), ...item, id: uid(), read: false }
    set((s) => ({ items: [full, ...s.items] }))
    // "Não perturbe": still listed in the center, but no toast and no sound.
    const quiet = alertSound(useSettings.getState().settings.general)
    if (!quiet) useAssistant.getState().set({ toast: full.title })
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

// Backend-fired entries (timers ending, reminders): every window adds its copy.
void backend.listen<NewNotification>('ekko://notify', (n) => useNotifications.getState().notify(n))
