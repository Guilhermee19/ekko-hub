import { Check, ExternalLink, FileX2, Loader2, Trash2, Wrench, type LucideIcon } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import type { ScanAction } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/primitives'
import { applyAction } from './actions'
import { formatBytes } from './metrics'
import { freeableBytes, statusCounts } from './score'
import { useMyPc } from './store'

/** Chips under the ring: how many checks passed, need attention, and space to free. */
export function ScanSummary() {
  const steps = useMyPc((s) => s.steps)
  const applied = useMyPc((s) => s.applied)
  const { ok, warn, info } = statusCounts(steps)
  const free = freeableBytes(steps, applied)
  const chips = [
    ok > 0 && { text: `${ok} em ordem`, tone: 'text-accent bg-accent/10' },
    warn > 0 && {
      text: `${warn} ${warn === 1 ? 'pede' : 'pedem'} atenção`,
      tone: 'text-danger bg-danger/10',
    },
    info > 0 && { text: `${info} para saber`, tone: 'text-muted bg-surface-hover' },
    free > 0 && {
      text: `até ${formatBytes(free)} para liberar`,
      tone: 'text-content bg-accent/15',
    },
  ].filter((c): c is { text: string; tone: string } => Boolean(c))
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span
          key={c.text}
          style={{ '--i': i } as CSSProperties}
          className={cn('scan-enter rounded-full px-2.5 py-0.5 text-[11.5px] font-medium', c.tone)}
        >
          {c.text}
        </span>
      ))}
    </div>
  )
}

const ACTION: Record<ScanAction['kind'], { icon: LucideIcon; title: string; button: string }> = {
  cleanTemp: { icon: FileX2, title: 'Limpar temporários', button: 'Limpar' },
  emptyRecycleBin: { icon: Trash2, title: 'Esvaziar a lixeira', button: 'Esvaziar' },
  openStartup: {
    icon: ExternalLink,
    title: 'Revisar programas de inicialização',
    button: 'Abrir',
  },
}

/** Cards for the checks that came back with a suggested action. */
export function Suggestions() {
  const steps = useMyPc((s) => s.steps)
  const applied = useMyPc((s) => s.applied)
  const [busy, setBusy] = useState<string | null>(null)
  const fixes = steps.flatMap((s) =>
    s.check?.action ? [{ id: s.id, action: s.check.action }] : [],
  )
  if (fixes.length === 0) return null

  const run = (id: string, action: ScanAction) => {
    setBusy(id)
    void applyAction(id, action).finally(() => setBusy(null))
  }

  return (
    <div className="mt-4 border-t border-border-soft pt-3">
      <div className="label-hud mb-2 flex items-center gap-1.5">
        <Wrench className="size-3" aria-hidden /> Sugestões
      </div>
      <ul className="flex flex-col gap-1.5">
        {fixes.map(({ id, action }, i) => {
          const done = applied.includes(id)
          const meta = ACTION[action.kind]
          const Icon = meta.icon
          return (
            <li
              key={id}
              style={{ '--i': i + 2 } as CSSProperties}
              className={cn(
                'scan-enter flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors duration-300',
                done ? 'border-accent/30 bg-accent/5' : 'border-border-soft',
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent/12 text-accent">
                {done ? (
                  <Check className="scan-pop size-3.5" strokeWidth={3} aria-hidden />
                ) : (
                  <Icon className="size-3.5" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium">{meta.title}</span>
                <span className="block text-[11px] text-muted">
                  {done
                    ? 'Feito'
                    : action.kind === 'openStartup'
                      ? 'Desative o que não precisa na tela do Windows'
                      : `Libera ${formatBytes(action.bytes)}`}
                </span>
              </span>
              {!done && (
                <Button
                  size="sm"
                  variant={action.kind === 'openStartup' ? 'ghost' : 'subtle'}
                  disabled={busy !== null}
                  onClick={() => run(id, action)}
                >
                  {busy === id && (
                    <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden />
                  )}
                  {meta.button}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
