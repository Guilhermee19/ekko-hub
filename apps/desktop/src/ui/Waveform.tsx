import { cn } from '@/lib/cn'

interface WaveformProps {
  bars?: number
  tone?: 'accent' | 'danger'
  /** Real levels (0..1) drive the bars; without them they loop on CSS. */
  levels?: readonly number[] | null
  className?: string
}

/** Level bars: live from the audio when `levels` is given, a gentle loop otherwise. */
export function Waveform({ bars = 5, tone = 'accent', levels, className }: WaveformProps) {
  const live = levels != null && levels.length > 0
  return (
    <span className={cn('flex h-4 items-center gap-[3px]', className)} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-full w-[3px] rounded-full',
            live ? 'origin-center transition-transform duration-75 ease-out' : 'animate-wave',
            tone === 'danger' ? 'bg-danger' : 'bg-accent',
          )}
          style={
            live
              ? { transform: `scaleY(${0.15 + 0.85 * (levels[i % levels.length] ?? 0)})` }
              : { animationDelay: `${(i * 137) % 700}ms` }
          }
        />
      ))}
    </span>
  )
}
