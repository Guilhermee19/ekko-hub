import type { ComponentType } from 'react'
import { ChatPage } from '@/features/chat/ChatPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { TimersPage } from '@/features/timers/TimersPage'
import { AgendaPage } from '@/features/calendar/AgendaPage'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { MusicPage } from '@/features/music/MusicPage'
import { ClipboardPage } from '@/features/clipboard/ClipboardPage'
import { ColorsPage } from '@/features/colors/ColorsPage'
import { RoutinesPage } from '@/features/routines/RoutinesPage'
import { MyPcPage } from '@/features/mypc/MyPcPage'
import { MemoryPage } from '@/features/memory/MemoryPage'
import { HomePage } from '@/features/home/HomePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import type { PageId } from './nav'

/** Props every panel page receives. */
export interface PageProps {
  /** Narrow popover (tray/orb) vs. wide panel (notch/dock/hub). */
  compact: boolean
  /** Jump to another page (e.g. a Home card opens Tasks). */
  go: (page: PageId) => void
}

export const PAGES: Record<PageId, ComponentType<PageProps>> = {
  home: HomePage,
  chat: ChatPage,
  tasks: TasksPage,
  timers: TimersPage,
  agenda: AgendaPage,
  habits: HabitsPage,
  music: MusicPage,
  clipboard: ClipboardPage,
  colors: ColorsPage,
  routines: RoutinesPage,
  mypc: MyPcPage,
  memory: MemoryPage,
  notifications: NotificationsPage,
}
