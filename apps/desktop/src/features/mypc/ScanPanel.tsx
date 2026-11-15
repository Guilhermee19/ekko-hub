import { AlertTriangle, Check, Circle, Loader2, RotateCcw, Sparkles, Wrench } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ProgressRing } from '@/ui/data'
import { Button } from '@/ui/primitives'
import { scanProgress, useMyPc, type ScanStep } from './store'

/** "Verificar meu PC": ring + step list; driven by timeouts inside the store action. */
export function ScanPanel({ compact }: { compact: boolean }) {
  const scan = useMyPc((s) => s.scan)
  const steps = useMyPc((s) => s.steps)
  const { startScan, resetScan } = useMyPc.getState()
  const progress = scanProgress(steps)
  const current = steps.find((s) => s.status === 'running')
  const warnings = steps.filter((s) => s.status === 'warn').length

  return (
    <section className="rounded-xl border border-border-soft bg-surface p-3">
      <div className={cn('flex gap-4', compact ? 'flex-col items-center' : 'items-center')}>
        <ProgressRing value={scan === 'idle' ? 0 : progress} size={compact ? 104 : 112} stroke={6}>
          <div>
            <div className="font-mono text-[22px] font-semibold tabular-nums">
              {scan === 'idle' ? '—' : `${Math.round(progress * 100)}%`}
            </div>
            <div className="label-hud">
              {scan === 'done' ? 'Concluído' : scan === 'idle' ? 'Pronto' : 'Progresso'}
            </div>
          </div>
        </ProgressRing>
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-2',
            compact && 'items-center text-center',
          )}
        >
          <div aria-live="polite">
            <div className="text-[14px] font-semibold">
              {scan === 'idle' && 'Verificar meu PC'}
              {scan === 'running' && 'Verificando seu PC…'}
              {scan === 'done' && (warnings ? `${warnings} pontos para melhorar` : 'Tudo em ordem')}
            </div>
            <div className="text-[12px] text-muted">
              {scan === 'idle' && 'Memória, disco, inicialização e arquivos que sobram.'}
              {scan === 'running' && (current ? `Olhando: ${current.label}` : 'Preparando…')}
              {scan === 'done' && 'Veja abaixo o que dá para resolver agora.'}
            </div>
          </div>
          {scan === 'idle' && (
            <Button variant="primary" onClick={startScan} className="self-start">
              <Sparkles className="size-3.5" /> Verificar agora
            </Button>
          )}
          {scan === 'done' && (
            <Button variant="ghost" onClick={resetScan} className={cn(!compact && 'self-start')}>
              <RotateCcw className="size-3.5" /> Verificar de novo
            </Button>
          )}
        </div>
      </div>

      {scan !== 'idle' && (
        <ul
          className={cn(
            'mt-3 grid gap-x-4 gap-y-1.5 border-t border-border-soft pt-3',
            !compact && 'grid-cols-2',
          )}
        >
          {steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </ul>
      )}

      {scan === 'done' && <Fixes />}
    </section>
  )
}

function StepRow({ step }: { step: ScanStep }) {
  return (
    <li className="flex items-start gap-2">
      <StepIcon status={step.status} />
      <div className="min-w-0">
        <div
          className={cn('text-[12px]', step.status === 'pending' ? 'text-muted' : 'text-content')}
        >
          {step.label}
        </div>
        {step.finding && (
          <div className="animate-rise-in truncate text-[11px] text-muted">{step.finding}</div>
        )}
      </div>
    </li>
  )
}

function StepIcon({ status }: { status: ScanStep['status'] }) {
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
  return <Circle className={cn(base, 'text-muted/60')} aria-label="Pendente" />
}

function Fixes() {
  const fixes = useMyPc((s) => s.fixes)
  const applyFix = useMyPc.getState().applyFix
  return (
    <div className="animate-rise-in mt-3 border-t border-border-soft pt-3">
      <div className="label-hud mb-2 flex items-center gap-1.5">
        <Wrench className="size-3" aria-hidden /> Sugestões
      </div>
      <div className="flex flex-wrap gap-1.5">
        {fixes.map((fix) => (
          <Button
            key={fix.id}
            variant={fix.done ? 'ghost' : 'subtle'}
            disabled={fix.done}
            onClick={() => applyFix(fix.id)}
            className="text-[12px]"
          >
            {fix.done && <Check className="size-3.5" aria-hidden />}
            {fix.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
