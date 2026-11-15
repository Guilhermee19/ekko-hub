import {
  AppWindow,
  BellOff,
  Clock,
  CloudSun,
  Droplets,
  ListChecks,
  MessageSquareQuote,
  Music,
  Newspaper,
  PowerOff,
  Timer,
  Volume2,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { TriggerKind } from './model'

export interface CatalogAction {
  id: string
  label: string
  icon: LucideIcon
}

/** Actions the mock builder offers. Real ones become Tools (with risk level) in F2+. */
export const ACTION_CATALOG: CatalogAction[] = [
  { id: 'briefing', label: 'Briefing do dia', icon: Newspaper },
  { id: 'weather', label: 'Previsão do tempo', icon: CloudSun },
  { id: 'tasks', label: 'Ler tarefas de hoje', icon: ListChecks },
  { id: 'spotify-lofi', label: 'Abrir Spotify: Lo-fi', icon: Music },
  { id: 'volume-30', label: 'Volume 30%', icon: Volume2 },
  { id: 'focus', label: 'Não perturbe', icon: BellOff },
  { id: 'vscode', label: 'Abrir VS Code', icon: AppWindow },
  { id: 'pomodoro', label: 'Pomodoro 25 min', icon: Timer },
  { id: 'water', label: 'Lembrete: beber água', icon: Droplets },
  { id: 'close-work', label: 'Fechar apps de trabalho', icon: PowerOff },
]

const BY_ID = new Map(ACTION_CATALOG.map((a) => [a.id, a]))

export function catalogAction(id: string): CatalogAction {
  return BY_ID.get(id) ?? { id, label: id, icon: Zap }
}

export const TRIGGER_ICONS: Record<TriggerKind, LucideIcon> = {
  time: Clock,
  phrase: MessageSquareQuote,
  event: Zap,
}
