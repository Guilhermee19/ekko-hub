import { AppWindow, Circle, Mic, PanelRight, PanelTop, Rows2, type LucideIcon } from 'lucide-react'
import { backend, type DisplayMode } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'

export const MODES: { id: DisplayMode; label: string; hint: string; icon: LucideIcon }[] = [
  {
    id: 'notch',
    label: 'Notch no topo',
    hint: 'Pílula no topo que abre ao passar o mouse',
    icon: PanelTop,
  },
  { id: 'tray', label: 'Bandeja', hint: 'Ícone perto do relógio, abre um flyout', icon: Rows2 },
  { id: 'orb', label: 'Bolha flutuante', hint: 'Bolha arrastável em qualquer canto', icon: Circle },
  { id: 'dock', label: 'Dock lateral', hint: 'Barra na borda que desliza', icon: PanelRight },
  { id: 'hub', label: 'Central (HUD)', hint: 'Janela grande, estilo Jarvis', icon: AppWindow },
  { id: 'voice-only', label: 'Só voz', hint: 'Nada fixo; atalho e “Ei, Ekko”', icon: Mic },
]

export function DisplayModePicker({ dense = false }: { dense?: boolean }) {
  const current = useSettings((s) => s.settings.displayMode)
  return (
    <div className={cn('grid gap-2', dense ? 'grid-cols-3' : 'grid-cols-3')}>
      {MODES.map(({ id, label, hint, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={hint}
          onClick={() => void backend.setDisplayMode(id)}
          className={cn(
            'flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-colors',
            id === current
              ? 'border-accent/60 bg-accent/10 text-accent'
              : 'border-border-soft text-muted hover:border-accent/30 hover:text-content',
          )}
        >
          <Icon className="size-4" />
          <span className="text-[12px] leading-tight font-medium">{label}</span>
          {!dense && <span className="text-[11px] leading-snug text-muted">{hint}</span>}
        </button>
      ))}
    </div>
  )
}
