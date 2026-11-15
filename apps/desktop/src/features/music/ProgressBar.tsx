import { formatTime } from './time'

interface ProgressBarProps {
  position: number
  duration: number
  onSeek: (sec: number) => void
}

/** Thin HUD bar with a transparent range input on top for seeking. */
export function ProgressBar({ position, duration, onSeek }: ProgressBarProps) {
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="group relative h-3">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border-soft">
          <div
            className="hud-glow h-full rounded-full bg-accent text-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-content opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          aria-label="Posição da faixa"
          aria-valuetext={`${formatTime(position)} de ${formatTime(duration)}`}
          min={0}
          max={duration}
          step={1}
          value={Math.floor(position)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted tabular-nums">
        <span>{formatTime(position)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}
