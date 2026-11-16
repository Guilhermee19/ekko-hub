import { useState } from 'react'
import { formatTime } from './time'

interface ProgressBarProps {
  position: number
  duration: number
  /** Omit when the player can't seek: the bar is then display-only. */
  onSeek?: (sec: number) => void
}

/** Thin HUD bar with a transparent range input on top. Dragging previews locally and
 * seeks once on release, so a drag doesn't flood the player with seeks. */
export function ProgressBar({ position, duration, onSeek }: ProgressBarProps) {
  const [drag, setDrag] = useState<number | null>(null)
  const shown = drag ?? position
  const pct = duration > 0 ? Math.min(100, (shown / duration) * 100) : 0
  const commit = () => {
    if (drag !== null) onSeek?.(drag)
    setDrag(null)
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="group relative h-3">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border-soft">
          <div
            className="hud-glow h-full rounded-full bg-accent text-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
        {onSeek && (
          <>
            <span
              className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-content opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              style={{ left: `${pct}%`, opacity: drag !== null ? 1 : undefined }}
            />
            <input
              type="range"
              aria-label="Posição da faixa"
              aria-valuetext={`${formatTime(shown)} de ${formatTime(duration)}`}
              min={0}
              max={duration}
              step={1}
              value={Math.floor(shown)}
              onChange={(e) => setDrag(Number(e.target.value))}
              onPointerUp={commit}
              onKeyUp={commit}
              onBlur={commit}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
            />
          </>
        )}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted tabular-nums">
        <span>{formatTime(shown)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}
