import { AlertTriangle, Check, Circle, Info, Loader2, Wrench } from 'lucide-react'
import { useState } from 'react'
import type { ScanAction } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/primitives'
import { applyAction } from './actions'
import { formatBytes } from './metrics'
import { useMyPc, type ScanStep, type StepStatus } from './store'

/** Items listed under a finding before "ver mais". */
const ITEMS = 3

export function StepRow({ step }: { step: ScanStep }) {
  const [more, setMore] = useState(false)
  const items = step.check?.items ?? []
  const shown = more ? items : items.slice(0, ITEMS)
  return (
    <li className="flex items-start gap-2">
      <StepIcon status={step.status} />
      <div className="min-w-0 flex-1">
        <div
          className={cn('text-[12px]', step.status === 'pending' ? 'text-muted' : 'text-content')}
        >
          {step.label}
        </div>
        {step.check && (
          <div className="animate-rise-in text-[11px] text-muted">{step.check.finding}</div>
        )}
        {shown.length > 0 && (
          <ul className="mt-1 flex flex-col gap-0.5">
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
            className="mt-0.5 text-[11px] text-accent hover:underline"
          >
            {more ? 'ver menos' : `ver todos (${items.length})`}
          </button>
        )}
      </div>
    </li>
  )
}

function StepIcon({ status }: { status: StepStatus }) {
  const base = 'mt-px size-3.5 shrink-0'
  if (status === 'running')
    return (
      <Loader2
        className={cn(base, 'text-accent motion-safe:animate-spin')}
        aria-label="Verificando"
      />
    )
  if (status === 'ok') return <Check className={cn(base, 'text-accent')} aria-label="Ok" />
  if (status === 'warn')
    return <AlertTriangle className={cn(base, 'text-danger')} aria-label="Atenção" />
  if (status === 'info') return <Info className={cn(base, 'text-muted')} aria-label="Informação" />
  return <Circle className={cn(base, 'text-muted/60')} aria-label="Pendente" />
}

function actionLabel(action: ScanAction): string {
  if (action.kind === 'cleanTemp') return `Limpar temporários (${formatBytes(action.bytes)})`
  if (action.kind === 'emptyRecycleBin') return `Esvaziar lixeira (${formatBytes(action.bytes)})`
  return 'Abrir programas de inicialização'
}

/** Buttons for the checks that came back with a suggested action. */
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
    <div className="animate-rise-in mt-3 border-t border-border-soft pt-3">
      <div className="label-hud mb-2 flex items-center gap-1.5">
        <Wrench className="size-3" aria-hidden /> Sugestões
      </div>
      <div className="flex flex-wrap gap-1.5">
        {fixes.map(({ id, action }) => {
          const done = applied.includes(id)
          return (
            <Button
              key={id}
              variant={done ? 'ghost' : 'subtle'}
              disabled={done || busy !== null}
              onClick={() => run(id, action)}
              className="text-[12px]"
            >
              {done && <Check className="size-3.5" aria-hidden />}
              {busy === id && <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden />}
              {actionLabel(action)}
            </Button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        O Ekko só lista os programas de inicialização; desative-os pela tela do Windows.
      </p>
    </div>
  )
}
