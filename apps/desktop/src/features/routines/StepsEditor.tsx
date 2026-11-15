import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from '@/ui/primitives'
import { ACTION_CATALOG, catalogAction } from './catalog'
import { moveItem, type RoutineStep } from './model'

interface StepsEditorProps {
  steps: RoutineStep[]
  onChange: (steps: RoutineStep[]) => void
  compact: boolean
}

/** Ordered list of chosen actions + the catalog to add from. */
export function StepsEditor({ steps, onChange, compact }: StepsEditorProps) {
  const add = (catalogId: string) => onChange([...steps, { id: crypto.randomUUID(), catalogId }])
  const move = (i: number, to: number) => onChange(moveItem(steps, i, to))
  return (
    <div className="flex flex-col gap-3">
      {steps.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-soft px-3 py-4 text-center text-[12px] text-muted">
          Nenhuma ação ainda. Escolha abaixo o que a rotina faz.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {steps.map((s, i) => {
            const { icon: Icon, label } = catalogAction(s.catalogId)
            return (
              <li
                key={s.id}
                className="animate-rise-in flex items-center gap-2 rounded-lg border border-border-soft bg-base/50 py-1 pr-1 pl-2"
              >
                <span className="w-4 font-mono text-[11px] text-muted tabular-nums">{i + 1}</span>
                <Icon className="size-3.5 text-accent" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13px]">{label}</span>
                <IconButton
                  label={`Subir ${label}`}
                  disabled={i === 0}
                  className="size-7 disabled:opacity-30"
                  onClick={() => move(i, i - 1)}
                >
                  <ArrowUp className="size-3.5" />
                </IconButton>
                <IconButton
                  label={`Descer ${label}`}
                  disabled={i === steps.length - 1}
                  className="size-7 disabled:opacity-30"
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowDown className="size-3.5" />
                </IconButton>
                <IconButton
                  label={`Remover ${label}`}
                  className="size-7"
                  onClick={() => onChange(steps.filter((x) => x.id !== s.id))}
                >
                  <X className="size-3.5" />
                </IconButton>
              </li>
            )
          })}
        </ol>
      )}

      <div>
        <div className="label-hud mb-1.5">Adicionar ação</div>
        <div className={cn('grid gap-1.5', compact ? 'grid-cols-1' : 'grid-cols-2')}>
          {ACTION_CATALOG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => add(id)}
              className="flex items-center gap-2 rounded-lg border border-border-soft px-2.5 py-1.5 text-left text-[12px] text-muted transition-colors hover:border-accent/40 hover:text-content"
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <Plus className="size-3 shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
