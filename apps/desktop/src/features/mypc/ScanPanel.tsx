import { RotateCcw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ProgressRing } from '@/ui/data'
import { Button } from '@/ui/primitives'
import { Suggestions, StepRow } from './ScanFindings'
import { scanProgress, useMyPc } from './store'

/** "Verificar meu PC": ring driven by the backend's per-step progress + findings. */
export function ScanPanel({ compact }: { compact: boolean }) {
  const scan = useMyPc((s) => s.scan)
  const steps = useMyPc((s) => s.steps)
  const error = useMyPc((s) => s.scanError)
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
              {scan === 'done' &&
                (error
                  ? 'A verificação parou no meio'
                  : warnings
                    ? `${warnings} ${warnings === 1 ? 'ponto' : 'pontos'} para melhorar`
                    : 'Tudo em ordem')}
            </div>
            <div className="text-[12px] text-muted">
              {scan === 'idle' &&
                'Memória, processador, inicialização, temporários, lixeira e disco.'}
              {scan === 'running' && (current ? `Olhando: ${current.label}` : 'Preparando…')}
              {scan === 'done' && (error ?? 'Nada muda sem você confirmar.')}
            </div>
          </div>
          {scan === 'idle' && (
            <Button variant="primary" onClick={startScan} className={cn(!compact && 'self-start')}>
              <Sparkles className="size-3.5" /> Verificar agora
            </Button>
          )}
          {scan === 'done' && (
            <Button
              variant="ghost"
              onClick={() => {
                resetScan()
                startScan()
              }}
              className={cn(!compact && 'self-start')}
            >
              <RotateCcw className="size-3.5" /> Verificar de novo
            </Button>
          )}
        </div>
      </div>

      {scan !== 'idle' && (
        <ul
          className={cn(
            'mt-3 grid gap-x-4 gap-y-2 border-t border-border-soft pt-3',
            !compact && 'grid-cols-2',
          )}
        >
          {steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </ul>
      )}

      {scan === 'done' && <Suggestions />}
    </section>
  )
}
