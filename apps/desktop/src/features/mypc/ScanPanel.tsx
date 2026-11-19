import { cn } from '@/lib/cn'
import { CheckTile } from './CheckTile'
import { ScanHero } from './ScanHero'
import { ScanSummary, Suggestions } from './ScanFindings'
import { scanGrade, scanScore } from './score'
import { scanProgress, useMyPc } from './store'
import './scan.css'

/** "Verificar meu PC": the ring (radar, then health score), one card per check and fixes. */
export function ScanPanel({ compact }: { compact: boolean }) {
  const scan = useMyPc((s) => s.scan)
  const steps = useMyPc((s) => s.steps)
  const error = useMyPc((s) => s.scanError)
  const { startScan, resetScan } = useMyPc.getState()
  const score = scan === 'done' ? scanScore(steps) : null
  const grade = score === null ? null : scanGrade(score)

  return (
    <section
      className="scan rounded-xl border border-border-soft bg-surface p-4"
      data-tone={grade ?? undefined}
    >
      <ScanHero
        scan={scan}
        progress={scanProgress(steps)}
        score={score}
        grade={grade}
        current={steps.find((s) => s.status === 'running')?.label ?? null}
        error={error}
        compact={compact}
        onStart={startScan}
        onRestart={() => {
          resetScan()
          startScan()
        }}
      />

      {scan === 'done' && !error && (
        <div className={cn('mt-3', compact && 'flex justify-center')}>
          <ScanSummary />
        </div>
      )}

      {scan !== 'idle' && (
        <ul className={cn('mt-4 grid gap-2', !compact && 'grid-cols-2')}>
          {steps.map((step, i) => (
            <CheckTile key={step.id} step={step} index={i} />
          ))}
        </ul>
      )}

      {scan === 'done' && <Suggestions />}
    </section>
  )
}
