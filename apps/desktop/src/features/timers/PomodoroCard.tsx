import { Brain, Coffee, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatRemaining } from '@/lib/time'
import { useNow } from '@/surfaces/shared/useNow'
import { ProgressRing } from '@/ui/data'
import { Button, Card, IconButton } from '@/ui/primitives'
import { elapsedFraction, remainingMs } from './format'
import { phaseSeconds, POMO_LABEL, useTimers } from './store'

const CYCLE = 4

/** Pomodoro: focus 25 / break 5, cycle counter, start/pause/skip. */
export function PomodoroCard() {
  const p = useTimers((s) => s.pomodoro)
  const { pomoStart, pomoPause, pomoSkip, pomoReset } = useTimers.getState()
  const running = p.endsAt !== null
  const now = useNow(running, 500)
  const total = phaseSeconds(p)
  const left = running ? remainingMs(p.endsAt ?? 0, total, now) : (p.pausedLeft ?? total * 1000)
  const started = running || p.pausedLeft !== null
  const PhaseIcon = p.phase === 'focus' ? Brain : Coffee

  return (
    <Card className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center gap-1.5 text-muted">
        <PhaseIcon className="size-3.5" aria-hidden />
        <span className="label-hud">Pomodoro</span>
        <span className="ml-auto text-[11px]">
          {p.focusMin} / {p.breakMin} min
        </span>
      </div>

      <ProgressRing value={elapsedFraction(left, total)} size={112} stroke={5}>
        <div>
          <div
            className={cn(
              'font-mono text-[22px] font-semibold tabular-nums',
              !running && started && 'text-muted',
            )}
          >
            {formatRemaining(left)}
          </div>
          <div className="label-hud">{POMO_LABEL[p.phase]}</div>
        </div>
      </ProgressRing>

      <div
        className="flex items-center gap-1.5"
        aria-label={`Ciclo ${(p.cycles % CYCLE) + 1} de ${CYCLE}`}
      >
        {Array.from({ length: CYCLE }, (_, i) => (
          <span
            key={i}
            className={cn(
              'size-1.5 rounded-full',
              i < p.cycles % CYCLE ? 'bg-accent' : 'bg-border-soft',
            )}
            aria-hidden
          />
        ))}
        <span className="ml-1 font-mono text-[11px] text-muted tabular-nums">{p.cycles} hoje</span>
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          label="Reiniciar pomodoro"
          onClick={pomoReset}
          disabled={!started}
          className="disabled:opacity-40"
        >
          <RotateCcw className="size-4" />
        </IconButton>
        <Button
          variant={running ? 'subtle' : 'primary'}
          onClick={running ? pomoPause : pomoStart}
          className="min-w-24"
        >
          {running ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
          {running ? 'Pausar' : started ? 'Retomar' : p.phase === 'focus' ? 'Focar' : 'Descansar'}
        </Button>
        <IconButton
          label={p.phase === 'focus' ? 'Pular para a pausa' : 'Pular para o foco'}
          onClick={pomoSkip}
        >
          <SkipForward className="size-4" />
        </IconButton>
      </div>
    </Card>
  )
}
