import { BellRing, Hourglass, Pause, Play, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { formatRemaining } from '@/lib/time'
import { Badge, EmptyState } from '@/ui/data'
import { Card, IconButton } from '@/ui/primitives'
import { elapsedFraction, formatDuration, remainingMs } from './format'
import { useTimers, type Timer } from './store'

const PRESETS = [1, 5, 10, 25]

/** Named countdowns + quick-add presets. */
export function TimerList({ now, compact }: { now: number; compact: boolean }) {
  const timers = useTimers((s) => s.timers)
  return (
    <section className="flex flex-col gap-2">
      <QuickAdd />
      {timers.length === 0 ? (
        <EmptyState
          icon={Hourglass}
          title="Nenhum timer ativo"
          hint="Escolha um tempo acima ou diga “timer de 10 minutos”."
        />
      ) : (
        <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
          {timers.map((t) => (
            <TimerCard key={t.id} timer={t} now={now} />
          ))}
        </div>
      )}
    </section>
  )
}

function QuickAdd() {
  const addTimer = useTimers((s) => s.addTimer)
  const [label, setLabel] = useState('')
  const start = (min: number) => {
    addTimer(label || `Timer de ${formatDuration(min * 60)}`, min * 60)
    setLabel('')
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-soft bg-base/60 p-1.5 focus-within:border-accent/50">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && start(5)}
        aria-label="Nome do timer"
        placeholder="Nome do timer (opcional) · Enter inicia 5 min"
        className="min-w-0 bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-muted"
      />
      <div className="flex gap-1.5">
        {PRESETS.map((min) => (
          <button
            key={min}
            type="button"
            onClick={() => start(min)}
            aria-label={`Iniciar timer de ${min} minuto${min === 1 ? '' : 's'}`}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border-soft py-1 font-mono text-[12px] text-muted tabular-nums transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Plus className="size-3" aria-hidden />
            {min} min
          </button>
        ))}
      </div>
    </div>
  )
}

function TimerCard({ timer, now }: { timer: Timer; now: number }) {
  const { pauseTimer, resumeTimer, cancelTimer } = useTimers.getState()
  const paused = timer.pausedLeft !== undefined
  const left = remainingMs(timer.endsAt, timer.total, now, timer.pausedLeft)
  const finished = !paused && left === 0
  const progress = elapsedFraction(left, timer.total)

  return (
    <Card
      className={cn('animate-rise-in relative overflow-hidden', finished && 'border-accent/40')}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] text-muted" title={timer.label}>
            {timer.label}
          </div>
          <div
            className={cn(
              'font-mono text-[24px] leading-tight font-semibold tabular-nums',
              paused ? 'text-muted' : finished ? 'hud-glow text-accent' : 'text-content',
            )}
            aria-live={finished ? 'polite' : 'off'}
          >
            {formatRemaining(left)}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
            <span className="font-mono tabular-nums">{formatDuration(timer.total)}</span>
            {paused && <Badge>Pausado</Badge>}
            {finished && (
              <Badge tone="accent">
                <BellRing className="size-3" aria-hidden /> Pronto
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-0.5">
          {!finished && (
            <IconButton
              label={paused ? `Retomar ${timer.label}` : `Pausar ${timer.label}`}
              onClick={() => (paused ? resumeTimer(timer.id) : pauseTimer(timer.id))}
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </IconButton>
          )}
          <IconButton
            label={finished ? `Dispensar ${timer.label}` : `Cancelar ${timer.label}`}
            onClick={() => cancelTimer(timer.id)}
          >
            <X className="size-4" />
          </IconButton>
        </div>
      </div>
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-border-soft" aria-hidden>
        <span
          className={cn(
            'block h-full transition-[width] duration-300',
            paused ? 'bg-muted' : 'bg-accent',
          )}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </span>
    </Card>
  )
}
