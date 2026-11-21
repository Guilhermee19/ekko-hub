import {
  AlarmClock,
  BatteryMedium,
  CalendarDays,
  Clipboard,
  Cpu,
  Droplets,
  Files,
  ListChecks,
  Music2,
  Pipette,
  Timer,
  type LucideIcon,
} from 'lucide-react'

export type HomeCardId =
  | 'water'
  | 'tasks'
  | 'reminders'
  | 'timers'
  | 'agenda'
  | 'pc'
  | 'battery'
  | 'clipboard'
  | 'shelf'
  | 'music'
  | 'colors'

export interface HomeCardMeta {
  id: HomeCardId
  label: string
  hint: string
  icon: LucideIcon
  /** Default columns in the 4-column home (1 when missing). */
  width?: HomeWidth
}

/** Every card the home can show, in the order "Adicionar" lists them. */
export const HOME_CARDS: HomeCardMeta[] = [
  { id: 'water', label: 'Água', hint: 'Copos de hoje, com +1 rápido', icon: Droplets },
  { id: 'tasks', label: 'Tarefas', hint: 'Em aberto e atrasadas', icon: ListChecks },
  { id: 'reminders', label: 'Avisos', hint: 'O próximo lembrete', icon: AlarmClock },
  { id: 'timers', label: 'Timers', hint: 'O timer que acaba primeiro', icon: Timer },
  { id: 'agenda', label: 'Agenda', hint: 'Próximo compromisso do Google', icon: CalendarDays },
  { id: 'pc', label: 'Meu PC', hint: 'Processador e memória ao vivo', icon: Cpu },
  {
    id: 'battery',
    label: 'Bateria',
    hint: 'Notebook, fones, mouse e teclado sem fio',
    icon: BatteryMedium,
    width: 2,
  },
  { id: 'clipboard', label: 'Copiados', hint: 'A última coisa copiada', icon: Clipboard },
  { id: 'shelf', label: 'Prateleira', hint: 'Arquivos guardados no notch', icon: Files },
  { id: 'music', label: 'Tocando agora', hint: 'Mini player com capa', icon: Music2, width: 2 },
  {
    id: 'colors',
    label: 'Cores',
    hint: 'Conta-gotas e as últimas cores pegas da tela',
    icon: Pipette,
    width: 2,
  },
]

/** The home is a 4-column grid (2 in the narrow panel). */
export type HomeWidth = 1 | 2 | 3 | 4
export const HOME_COLUMNS = 4

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

/** Columns a card takes: the user's choice, else its default; always 1..4. */
export function cardWidth(id: HomeCardId, saved: Readonly<Record<string, number>>): HomeWidth {
  const w = saved[id] ?? cardMeta(id).width ?? 1
  return Math.min(HOME_COLUMNS, Math.max(1, Math.round(w))) as HomeWidth
}

/** Grid classes per width; the narrow (2-column) layout caps everything at 2. */
const SPAN: Record<HomeWidth, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-2 @lg:col-span-3',
  4: 'col-span-2 @lg:col-span-4',
}

export function spanClass(width: HomeWidth, compact: boolean): string {
  return compact ? (width === 1 ? 'col-span-1' : 'col-span-2') : SPAN[width]
}

/** Cards not on the home yet, for "Adicionar card". */
export function missingCards(layout: readonly HomeCardId[]): HomeCardMeta[] {
  return HOME_CARDS.filter((c) => !layout.includes(c.id))
}
