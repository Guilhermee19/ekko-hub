import {
  AlarmClock,
  CalendarDays,
  Clipboard,
  Cpu,
  Droplets,
  Files,
  ListChecks,
  Music2,
  Timer,
  type LucideIcon,
} from 'lucide-react'

export type HomeCardId =
  'water' | 'tasks' | 'reminders' | 'timers' | 'agenda' | 'pc' | 'clipboard' | 'shelf' | 'music'

export interface HomeCardMeta {
  id: HomeCardId
  label: string
  hint: string
  icon: LucideIcon
  /** Takes the whole row (the mini player). */
  wide?: boolean
}

/** Every card the home can show, in the order "Adicionar" lists them. */
export const HOME_CARDS: HomeCardMeta[] = [
  { id: 'water', label: 'Água', hint: 'Copos de hoje, com +1 rápido', icon: Droplets },
  { id: 'tasks', label: 'Tarefas', hint: 'Em aberto e atrasadas', icon: ListChecks },
  { id: 'reminders', label: 'Avisos', hint: 'O próximo lembrete', icon: AlarmClock },
  { id: 'timers', label: 'Timers', hint: 'O timer que acaba primeiro', icon: Timer },
  { id: 'agenda', label: 'Agenda', hint: 'Próximo compromisso do Google', icon: CalendarDays },
  { id: 'pc', label: 'Meu PC', hint: 'Processador e memória ao vivo', icon: Cpu },
  { id: 'clipboard', label: 'Copiados', hint: 'A última coisa copiada', icon: Clipboard },
  { id: 'shelf', label: 'Prateleira', hint: 'Arquivos guardados no notch', icon: Files },
  { id: 'music', label: 'Tocando agora', hint: 'Mini player com capa', icon: Music2, wide: true },
]

export const DEFAULT_HOME: HomeCardId[] = ['water', 'tasks', 'reminders', 'timers', 'music']

const META = new Map(HOME_CARDS.map((c) => [c.id, c]))

export const cardMeta = (id: HomeCardId) => META.get(id) as HomeCardMeta

/** Saved list → known cards in order; null means the default set. */
export function homeLayout(saved: readonly string[] | null): HomeCardId[] {
  if (saved === null) return [...DEFAULT_HOME]
  const out: HomeCardId[] = []
  for (const id of saved) {
    if (META.has(id as HomeCardId) && !out.includes(id as HomeCardId)) out.push(id as HomeCardId)
  }
  return out
}

/** Cards not on the home yet, for "Adicionar card". */
export function missingCards(layout: readonly HomeCardId[]): HomeCardMeta[] {
  return HOME_CARDS.filter((c) => !layout.includes(c.id))
}
