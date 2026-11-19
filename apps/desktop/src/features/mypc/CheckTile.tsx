import {
  AlertTriangle,
  Check,
  Cpu,
  FileX2,
  HardDrive,
  Info,
  MemoryStick,
  Rocket,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import type { ScanStep } from './store'

const ICON: Record<string, LucideIcon> = {
  memory: MemoryStick,
  cpu: Cpu,
  startup: Rocket,
  temp: FileX2,
  bin: Trash2,
  disk: HardDrive,
}

/** Items listed under a finding before "ver todos". */
const ITEMS = 3

/** One check as a card: shimmer while waiting, scan line while running, result after. */
export function CheckTile({ step, index }: { step: ScanStep; index: number }) {
  const [more, setMore] = useState(false)
  const Icon = ICON[step.id] ?? Info
  const items = step.check?.items ?? []
  const shown = more ? items : items.slice(0, ITEMS)
  const warn = step.status === 'warn'
  const running = step.status === 'running'
  const pending = step.status === 'pending'
  return (
    <li
      style={{ '--i': index } as CSSProperties}
      className={cn(
        'scan-enter relative overflow-hidden rounded-lg border p-2.5 transition-colors duration-300',
        warn
          ? 'border-danger/40 bg-danger/5'
          : running
            ? 'border-accent/40 bg-accent/5'
            : 'border-border-soft',
      )}
    >
      {/* Own layer: sharing `animation` with scan-enter would replay the entry. */}
      {pending && (
        <span className="scan-shimmer pointer-events-none absolute inset-0" aria-hidden />
      )}
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-md transition-colors duration-300',
            warn
              ? 'bg-danger/15 text-danger'
              : pending
                ? 'bg-surface-hover text-muted'
                : 'bg-accent/12 text-accent',
          )}
        >
          <Icon className={cn('size-3.5', running && 'animate-hud-breathe')} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn('flex-1 truncate text-[12.5px] font-medium', pending && 'text-muted')}
            >
              {step.label}
            </span>
            <Badge status={step.status} />
          </div>
          {step.check ? (
            <div className="scan-swap text-[11.5px] text-muted">{step.check.finding}</div>
          ) : (
            <div className="text-[11.5px] text-muted/60">
              {running ? 'Verificando…' : 'Na fila'}
            </div>
          )}
        </div>
      </div>
      {shown.length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5 border-t border-border-soft pt-1.5">
          {shown.map((item, i) => (
            <li key={i} className="flex justify-between gap-2 text-[11px]">
              <span className={cn('truncate', item.warn ? 'text-danger' : 'text-content/80')}>
                {item.label}
              </span>
              <span className="shrink-0 truncate text-muted" title={item.detail}>
                {item.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
      {items.length > ITEMS && (
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          className="mt-1 text-[11px] text-accent hover:underline"
        >
          {more ? 'ver menos' : `ver todos (${items.length})`}
        </button>
      )}
      {running && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden" aria-hidden>
          <span className="scan-line block h-full w-2/5 rounded-full bg-accent" />
        </span>
      )}
    </li>
  )
}

function Badge({ status }: { status: ScanStep['status'] }) {
  if (status === 'ok')
    return (
      <span
        className="scan-pop grid size-4 place-items-center rounded-full bg-accent/20 text-accent"
        aria-label="Ok"
      >
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    )
  if (status === 'warn')
    return (
      <span className="scan-pop text-danger" aria-label="Atenção">
        <AlertTriangle className="size-3.5" />
      </span>
    )
  if (status === 'info')
    return (
      <span className="scan-pop text-muted" aria-label="Informação">
        <Info className="size-3.5" />
      </span>
    )
  return null
}
