import { History, Play } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Toggle } from '@/ui/forms'
import { Button } from '@/ui/primitives'
import { FlowChips } from './Chips'
import { formatLastRun, type Routine } from './model'
import { useRoutines } from './store'

interface RoutineCardProps {
  routine: Routine
  now: number
  onEdit: () => void
}

export function RoutineCard({ routine: r, now, onEdit }: RoutineCardProps) {
  const setEnabled = useRoutines((s) => s.setEnabled)
  const runNow = useRoutines((s) => s.runNow)
  return (
    <li
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border bg-surface p-3 transition-colors hover:border-accent/30',
        r.enabled ? 'border-border-soft' : 'border-border-soft/60',
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar rotina ${r.name}`}
          className="min-w-0 flex-1 truncate text-left text-[14px] font-medium hover:text-accent"
        >
          {r.name}
        </button>
        <Toggle
          checked={r.enabled}
          label={`Rotina ${r.name} ativa`}
          onChange={(v) => setEnabled(r.id, v)}
        />
      </div>
      {/* Mouse shortcut only; keyboard users edit via the name button above. */}
      <div
        onClick={onEdit}
        className={cn('cursor-pointer transition-opacity', !r.enabled && 'opacity-50')}
      >
        <FlowChips trigger={r.trigger} steps={r.steps} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <History className="size-3" aria-hidden />
          <span className="tabular-nums">
            {r.lastRunAt === null ? 'Nunca rodou' : `Rodou ${formatLastRun(r.lastRunAt, now)}`}
          </span>
        </span>
        <Button variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => runNow(r.id)}>
          <Play className="size-3" /> Rodar agora
        </Button>
      </div>
    </li>
  )
}
