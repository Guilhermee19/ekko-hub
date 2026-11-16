import {
  Bell,
  Brain,
  CalendarDays,
  Clipboard,
  Cpu,
  Droplets,
  Home,
  ListChecks,
  MessageSquare,
  Music2,
  Timer,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export type PageId =
  | 'home'
  | 'chat'
  | 'tasks'
  | 'timers'
  | 'agenda'
  | 'habits'
  | 'music'
  | 'clipboard'
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
  { id: 'routines', label: 'Rotinas', icon: Workflow },
  { id: 'mypc', label: 'Meu PC', icon: Cpu },
  { id: 'memory', label: 'Memória', icon: Brain },
  { id: 'notifications', label: 'Notificações', icon: Bell },
]
