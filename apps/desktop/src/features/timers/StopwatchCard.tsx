import { Flag, Pause, Play, RotateCcw, Watch } from 'lucide-react'
import { useNow } from '@/surfaces/shared/useNow'
import { Button, Card, IconButton } from '@/ui/primitives'
import { formatElapsed } from './format'
import { useTimers } from './store'

/** Stopwatch: start/pause/lap/reset with a laps list (newest first). */
export function StopwatchCard() {
  const sw = useTimers((s) => s.stopwatch)
  const { swStart, swPause, swLap, swReset } = useTimers.getState()
  const running = sw.startedAt !== null
  const now = useNow(running, 100)
  const elapsed = sw.elapsed + (sw.startedAt ? Math.max(0, now - sw.startedAt) : 0)
  const idle = !running && elapsed === 0

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-muted">
        <Watch className="size-3.5" aria-hidden />
        <span className="label-hud">Cronômetro</span>
      </div>
      <div className="text-center font-mono text-[30px] leading-none font-semibold tabular-nums">
        {formatElapsed(elapsed)}
      </div>
      <div className="flex items-center justify-center gap-2">
        <IconButton
          label="Zerar cronômetro"
          onClick={swReset}
          disabled={idle}
          className="disabled:opacity-40"
        >
          <RotateCcw className="size-4" />
        </IconButton>
        <Button
          variant={running ? 'subtle' : 'primary'}
          onClick={running ? swPause : swStart}
          className="min-w-24"
        >
          {running ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
          {running ? 'Pausar' : idle ? 'Iniciar' : 'Retomar'}
        </Button>
        <IconButton
          label="Marcar volta"
          onClick={swLap}
          disabled={!running}
          className="disabled:opacity-40"
        >
          <Flag className="size-4" />
        </IconButton>
      </div>
      {sw.laps.length > 0 && (
        <ol className="scroll-thin flex max-h-28 flex-col overflow-y-auto border-t border-border-soft pt-1.5">
          {sw.laps
            .map((total, i) => ({ n: i + 1, total, split: total - (sw.laps[i - 1] ?? 0) }))
            .reverse()
            .map((lap) => (
              <li
                key={lap.n}
                className="flex items-center justify-between py-0.5 font-mono text-[12px] tabular-nums"
              >
                <span className="text-muted">Volta {lap.n}</span>
                <span>{formatElapsed(lap.split)}</span>
                <span className="text-muted">{formatElapsed(lap.total)}</span>
              </li>
            ))}
        </ol>
      )}
    </Card>
  )
}
