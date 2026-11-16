import { ChevronRight, Lock, TriangleAlert } from 'lucide-react'
import type { ProcessGroup } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/data'
import { Button } from '@/ui/primitives'
import { endTask } from './actions'
import { formatBytes } from './metrics'

const cpuText = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

interface Props {
  group: ProcessGroup
  /** Biggest memory in the list, for the bar. */
  top: number
  open: boolean
  onToggle: () => void
}

/** One app (group) row; expands into its pids, each one endable on its own. */
export function ProcessRow({ group: g, top, open, onToggle }: Props) {
  const canEnd = g.protection !== 'protected'
  return (
    <>
      <tr className="border-t border-border-soft hover:bg-surface-hover">
        <td className="px-3 py-1.5">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex w-full min-w-0 items-center gap-2 rounded text-left focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
            title={g.path ?? g.name}
          >
            <ChevronRight
              className={cn(
                'size-3.5 shrink-0 text-muted transition-transform',
                open && 'rotate-90',
              )}
              aria-hidden
            />
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-hover text-[11px] font-semibold text-accent">
              {g.label[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px]">{g.label}</span>
                {g.count > 1 && <span className="shrink-0 text-[11px] text-muted">×{g.count}</span>}
                {g.protection === 'protected' && (
                  <Badge>
                    <Lock className="size-2.5" aria-hidden /> Protegido
                  </Badge>
                )}
                {g.protection === 'warn' && (
                  <Badge tone="danger">
                    <TriangleAlert className="size-2.5" aria-hidden /> Cuidado
                  </Badge>
                )}
              </span>
              <span className="mt-1 block h-0.5 rounded-full bg-border-soft">
                <span
                  className="block h-full rounded-full bg-accent/70"
                  style={{ width: `${(g.memory / top) * 100}%` }}
                />
              </span>
            </span>
          </button>
        </td>
        <td className="px-2 py-1.5 text-right font-mono text-muted tabular-nums">
          {formatBytes(g.memory)}
        </td>
        <td className="px-2 py-1.5 text-right font-mono text-muted tabular-nums">
          {cpuText(g.cpu)}
        </td>
        <td className="px-2 py-1.5 text-right">
          {canEnd && (
            <Button variant="ghost" size="sm" onClick={() => void endTask(g)}>
              Finalizar
            </Button>
          )}
        </td>
      </tr>
      {open &&
        g.processes.map((p) => (
          <tr key={p.pid} className="bg-base/40 text-muted">
            <td className="py-1 pr-3 pl-14 font-mono text-[11px]">
              {g.name} · pid {p.pid}
            </td>
            <td className="px-2 py-1 text-right font-mono text-[11px] tabular-nums">
              {formatBytes(p.memory)}
            </td>
            <td className="px-2 py-1 text-right font-mono text-[11px] tabular-nums">
              {cpuText(p.cpu)}
            </td>
            <td className="px-2 py-1 text-right">
              {canEnd && g.count > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px]"
                  aria-label={`Finalizar o processo ${p.pid}`}
                  onClick={() => void endTask(g, p.pid)}
                >
                  Só este
                </Button>
              )}
            </td>
          </tr>
        ))}
    </>
  )
}
