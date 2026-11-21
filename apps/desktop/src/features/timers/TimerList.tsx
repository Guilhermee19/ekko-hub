import { BellRing, Hourglass, Pause, Play, Plus, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { formatRemaining } from '@/lib/time'
import { Badge, EmptyState } from '@/ui/data'
import { Card, IconButton } from '@/ui/primitives'
import { durationSeconds, elapsedFraction, formatDuration, remainingMs } from './format'
import { useTimers, type Timer } from './store'

const PRESETS = [1, 5, 10, 25, 60]

const UNITS = [
  { key: 'h', unit: 'h', label: 'Horas' },
  { key: 'm', unit: 'min', label: 'Minutos' },
  { key: 's', unit: 's', label: 'Segundos' },
] as const

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
          hint="Digite qualquer tempo acima ou escolha um atalho."
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
  const [time, setTime] = useState({ h: '', m: '', s: '' })
  const custom = durationSeconds(time.h, time.m, time.s)
  const start = (seconds: number) => {
    if (seconds <= 0) return
    addTimer(label || `Timer de ${formatDuration(seconds)}`, seconds)
    setLabel('')
    setTime({ h: '', m: '', s: '' })
  }
  // Enter anywhere starts the typed time, or 5 min when none was typed.
  const onEnter = (e: KeyboardEvent<HTMLInputElement>) =>
    e.key === 'Enter' && start(custom || 5 * 60)
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-soft bg-base/60 p-1.5 focus-within:border-accent/50">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={onEnter}
        aria-label="Nome do timer"
        placeholder="Nome do timer (opcional)"
        className="min-w-0 bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-muted"
      />
      <div className="flex items-center gap-1.5">
        {UNITS.map(({ key, unit, label: name }) => (
          <label
            key={key}
            className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-border-soft px-2 py-1 focus-within:border-accent/50"
          >
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={key === 'h' ? 99 : 59}
              value={time[key]}
              onChange={(e) => setTime((t) => ({ ...t, [key]: e.target.value }))}
              onKeyDown={onEnter}
              aria-label={name}
              placeholder="0"
              className="w-full min-w-0 [appearance:textfield] bg-transparent text-right font-mono text-[13px] tabular-nums outline-none placeholder:text-muted [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[11px] text-muted">{unit}</span>
          </label>
        ))}
        <button
          type="button"
          onClick={() => start(custom)}
          disabled={custom === 0}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-accent-strong px-3 py-1 text-[12px] font-semibold text-white transition-[opacity,filter] hover:brightness-110 disabled:opacity-40"
        >
          <Play className="size-3 fill-current" aria-hidden />
          Iniciar
        </button>
      </div>
      <div className="flex gap-1.5">
        {PRESETS.map((min) => (
          <button
            key={min}
            type="button"
            onClick={() => start(min * 60)}
            aria-label={`Iniciar timer de ${formatDuration(min * 60)}`}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border-soft py-1 font-mono text-[12px] text-muted tabular-nums transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Plus className="size-3" aria-hidden />
            {formatDuration(min * 60)}
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
