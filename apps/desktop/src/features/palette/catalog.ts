import {
  Cpu,
  Droplets,
  FolderInput,
  Palette,
  Play,
  Settings,
  Timer,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { backend, type Persona } from '@/lib/ipc'
import { useAssistant } from '@/stores/assistant'
import { requestConfirm, type Risk } from '@/stores/confirm'
import { VISIBLE_NAV, type PageId } from '@/surfaces/panel/nav'
import { MODES } from '@/surfaces/settings/DisplayModePicker'
import { useHabits } from '../habits/store'
import { useMusic } from '../music/store'
import { endTask } from '../mypc/actions'
import { useMyPc } from '../mypc/store'
import { useTimers } from '../timers/store'
import type { Rankable } from './commands'

export interface PaletteCommand extends Rankable {
  icon: LucideIcon
  hint?: string
  /** Shown as a Badge: the action goes through the confirmation dialog. */
  risk?: Risk
  /** A returned promise keeps the palette open until it settles (confirm dialogs). */
  run: () => void | Promise<unknown>
}

export interface CatalogContext {
  onNavigate?: (page: PageId) => void
}

const toast = (text: string) => useAssistant.getState().set({ toast: text })

const PERSONAS: { id: Persona; label: string }[] = [
  { id: 'ekko', label: 'Ekko (ciano)' },
  { id: 'tobby', label: 'Tobby (verde-água)' },
  { id: 'ultron', label: 'Ultron (âmbar)' },
]

function actions({ onNavigate }: CatalogContext): PaletteCommand[] {
  return [
    {
      id: 'timer-5',
      group: 'actions',
      label: 'Iniciar timer de 5 min',
      keywords: ['cronometro', 'contagem', 'alarme'],
      icon: Timer,
      run: () => {
        useTimers.getState().addTimer('5 min', 300)
        toast('Timer de 5 minutos iniciado')
      },
    },
    {
      id: 'music-toggle',
      group: 'actions',
      label: 'Pausar/tocar música',
      keywords: ['play', 'pause', 'spotify'],
      icon: Play,
      run: () => useMusic.getState().toggle(),
    },
    {
      id: 'water',
      group: 'actions',
      label: 'Beber água +1',
      keywords: ['copo', 'habito', 'hidratar'],
      icon: Droplets,
      run: () => {
        void useHabits
          .getState()
          .addWater(1)
          .then(() => {
            const { count, goal } = useHabits.getState().water
            toast(`Água: ${count} de ${goal} copos`)
          })
      },
    },
    {
      id: 'mypc-scan',
      group: 'actions',
      label: 'Verificar meu PC…',
      keywords: ['diagnostico', 'lento', 'scan'],
      icon: Cpu,
      run: () => {
        useMyPc.getState().startScan()
        onNavigate?.('mypc')
      },
    },
    {
      id: 'organize-desktop',
      group: 'actions',
      label: 'Organizar a área de trabalho',
      keywords: ['arquivos', 'limpar'],
      icon: FolderInput,
      risk: 'confirm',
      run: () =>
        requestConfirm({
          title: 'Organizar a área de trabalho',
          detail: 'Move 23 arquivos soltos para pastas por tipo.',
          tool: 'files.organize_desktop',
          risk: 'confirm',
          confirmLabel: 'Organizar',
          undoable: true,
        }).then((ok) => ok && toast('Área de trabalho organizada')),
    },
    {
      id: 'close-heavy',
      group: 'actions',
      label: 'Fechar o programa mais pesado…',
      keywords: ['programa pesado', 'memoria', 'encerrar', 'finalizar tarefa'],
      icon: XCircle,
      risk: 'confirm',
      run: () => {
        void backend.systemProcesses('memory').then((groups) => {
          const heaviest = groups.find((g) => g.protection === 'ok')
          if (heaviest) void endTask(heaviest)
          else toast('Nada pesado para fechar agora')
        })
      },
    },
  ]
}

function navigation({ onNavigate }: CatalogContext): PaletteCommand[] {
  if (!onNavigate) return []
  return VISIBLE_NAV.map((n) => ({
    id: `go-${n.id}`,
    group: 'navigate',
    label: n.label,
    keywords: ['abrir', 'ir', n.id],
    icon: n.icon,
    run: () => onNavigate(n.id),
  }))
}

function settings(): PaletteCommand[] {
  return [
    {
      id: 'open-settings',
      group: 'settings',
      label: 'Abrir configurações',
      keywords: ['preferencias', 'opcoes'],
      icon: Settings,
      run: () => void backend.openSettings(),
    },
    ...MODES.map((m): PaletteCommand => ({
      id: `mode-${m.id}`,
      group: 'settings',
      label: `Modo de exibição: ${m.label}`,
      keywords: ['trocar', 'modo', m.id],
      hint: m.hint,
      icon: m.icon,
      run: () => void backend.setDisplayMode(m.id),
    })),
    ...PERSONAS.map((p): PaletteCommand => ({
      id: `persona-${p.id}`,
      group: 'settings',
      label: `Persona: ${p.label}`,
      keywords: ['tema', 'cor', 'trocar'],
      icon: Palette,
      run: () => void backend.setPersona(p.id),
    })),
  ]
}

/** Every palette command; `onNavigate` absent = no "Ir para" group. */
export function buildCatalog(ctx: CatalogContext): PaletteCommand[] {
  return [...actions(ctx), ...navigation(ctx), ...settings()]
}
