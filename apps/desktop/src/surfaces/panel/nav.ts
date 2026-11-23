import {
  Bell,
  Brain,
  CalendarDays,
  Clipboard,
  Cpu,
  Droplets,
  Home,
  Palette,
  ListChecks,
  MessageSquare,
  Music2,
  Timer,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { pageShown } from '@/lib/availability'

export type PageId =
  | 'home'
  | 'chat'
  | 'tasks'
  | 'timers'
  | 'agenda'
  | 'habits'
  | 'music'
  | 'clipboard'
  | 'colors'
  | 'routines'
  | 'mypc'
  | 'memory'
  | 'notifications'

export interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
}

export const NAV: NavItem[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'chat', label: 'Conversa', icon: MessageSquare },
  { id: 'tasks', label: 'Tarefas', icon: ListChecks },
  { id: 'timers', label: 'Timers', icon: Timer },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'habits', label: 'Hábitos', icon: Droplets },
  { id: 'music', label: 'Música', icon: Music2 },
  { id: 'clipboard', label: 'Copiados', icon: Clipboard },
  { id: 'colors', label: 'Cores', icon: Palette },
  { id: 'routines', label: 'Rotinas', icon: Workflow },
  { id: 'mypc', label: 'Meu PC', icon: Cpu },
  { id: 'memory', label: 'Memória', icon: Brain },
  { id: 'notifications', label: 'Notificações', icon: Bell },
]

/** What the menus show: everything except prototypes still "Em breve". */
export const VISIBLE_NAV: NavItem[] = NAV.filter((n) => pageShown(n.id))
