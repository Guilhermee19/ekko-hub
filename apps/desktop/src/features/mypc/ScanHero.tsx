import { Gauge, RotateCcw, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/primitives'
import { GRADE_LABEL, type Grade } from './score'
import { useCountUp } from './useCountUp'

interface ScanHeroProps {
  scan: 'idle' | 'running' | 'done'
  /** 0..1 while running. */
  progress: number
  score: number | null
  grade: Grade | null
  current: string | null
  error: string | null
  compact: boolean
  onStart: () => void
  onRestart: () => void
}

/** The ring: radar while checking, the health score once done. */
export function ScanHero(p: ScanHeroProps) {
  const size = p.compact ? 112 : 124
  const done = p.scan === 'done' && p.score !== null && !p.error
  const fill = p.scan === 'running' ? p.progress : done ? (p.score ?? 0) / 100 : 0
  return (
    <div className={cn('flex gap-5', p.compact ? 'flex-col items-center' : 'items-center')}>
      <Ring size={size} fill={fill} running={p.scan === 'running'} burst={done}>
        {p.scan === 'idle' && <Gauge className="size-8 text-accent" aria-hidden />}
        {p.scan === 'running' && <Percent value={Math.round(p.progress * 100)} />}
        {p.scan === 'done' &&
          (done ? <Score score={p.score ?? 0} /> : <span className="text-muted">—</span>)}
      </Ring>
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-2.5',
          p.compact && 'items-center text-center',
        )}
      >
        <div aria-live="polite">
          <Headline {...p} />
          <div className="text-[12px] text-muted">
            {p.scan === 'idle' &&
              'Memória, processador, inicialização, temporários, lixeira e disco. Leva poucos segundos.'}
            {p.scan === 'running' && (
              // key: each new step slides in instead of just swapping text.
              <span key={p.current ?? 'prep'} className="scan-swap inline-block">
                {p.current ? `Olhando: ${p.current}` : 'Preparando…'}
              </span>
            )}
            {p.scan === 'done' && (p.error ?? 'Nada muda no seu PC sem você confirmar.')}
          </div>
        </div>
        {p.scan === 'idle' && (
          <Button variant="primary" onClick={p.onStart} className={cn(!p.compact && 'self-start')}>
            <Sparkles className="size-3.5" /> Verificar agora
          </Button>
        )}
        {p.scan === 'done' && (
          <Button variant="ghost" onClick={p.onRestart} className={cn(!p.compact && 'self-start')}>
            <RotateCcw className="size-3.5" /> Verificar de novo
          </Button>
        )}
      </div>
    </div>
  )
}

function Headline({ scan, grade, error }: ScanHeroProps) {
  const text =
    scan === 'idle'
      ? 'Verificar meu PC'
      : scan === 'running'
        ? 'Verificando seu PC…'
        : error
          ? 'A verificação parou no meio'
          : grade
            ? GRADE_LABEL[grade]
            : 'Pronto'
  return (
    <div
      key={text}
      className={cn(
        'scan-swap text-[15px] font-semibold',
        scan === 'done' && !error && 'scan-tone-text',
      )}
    >
      {text}
    </div>
  )
}

function Percent({ value }: { value: number }) {
  return (
    <div>
      <div className="font-mono text-[22px] font-semibold tabular-nums">{value}%</div>
      <div className="label-hud">Verificando</div>
    </div>
  )
}

function Score({ score }: { score: number }) {
  const shown = useCountUp(score)
  return (
    <div>
      <div className="scan-tone-text font-mono text-[28px] leading-none font-semibold tabular-nums">
        {shown}
      </div>
      <div className="label-hud mt-1">de 100</div>
    </div>
  )
}

function Ring({
  size,
  fill,
  running,
  burst,
  children,
}: {
  size: number
  fill: number
  running: boolean
  burst: boolean
  children: ReactNode
}) {
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div
      className={cn(
        'relative grid shrink-0 place-items-center rounded-full',
        burst && 'scan-burst',
      )}
      style={{ width: size, height: size }}
    >
      {running && <span className="scan-sweep absolute inset-0 rounded-full" aria-hidden />}
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border-soft"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, fill)))}
          className="scan-tone-stroke transition-[stroke-dashoffset] duration-700 ease-out-soft"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
