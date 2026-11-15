import { GlassWater, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ProgressRing } from '@/ui/data'
import { Card, IconButton } from '@/ui/primitives'
import { useHabits } from './store'

/** Water intake: one icon per cup (click to fill up to it), +1 / -1 and a ring. */
export function WaterCard() {
  const { count, goal } = useHabits((s) => s.water)
  const { addWater, setWater } = useHabits.getState()
  const ml = count * 250

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-muted">
        <GlassWater className="size-3.5" aria-hidden />
        <span className="label-hud">Água</span>
        <span className="ml-auto font-mono text-[11px] tabular-nums">
          {(ml / 1000).toLocaleString('pt-BR')} L
        </span>
      </div>
      <div className="flex items-center gap-4">
        <ProgressRing value={count / goal} size={80} stroke={5}>
          <div className="font-mono text-[15px] font-semibold tabular-nums">
            {count}
            <span className="text-muted">/{goal}</span>
          </div>
        </ProgressRing>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="grid grid-cols-4 gap-1" role="group" aria-label="Copos de água">
            {Array.from({ length: goal }, (_, i) => {
              const filled = i < count
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`${i + 1} copo${i ? 's' : ''}`}
                  aria-pressed={filled}
                  onClick={() => setWater(count === i + 1 ? i : i + 1)}
                  className={cn(
                    'grid h-8 place-items-center rounded-md transition-colors hover:bg-surface-hover',
                    filled ? 'text-accent' : 'text-muted/50 hover:text-muted',
                  )}
                >
                  <GlassWater className={cn('size-5', filled && 'fill-accent/25')} />
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted">
              {count >= goal
                ? 'Meta batida!'
                : `Faltam ${goal - count} copo${goal - count === 1 ? '' : 's'}`}
            </span>
            <div className="flex gap-1">
              <IconButton
                label="Remover um copo"
                onClick={() => addWater(-1)}
                disabled={count === 0}
                className="size-7 disabled:opacity-40"
              >
                <Minus className="size-3.5" />
              </IconButton>
              <IconButton
                label="Adicionar um copo"
                tone="accent"
                onClick={() => addWater(1)}
                className="size-7"
              >
                <Plus className="size-3.5" />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
