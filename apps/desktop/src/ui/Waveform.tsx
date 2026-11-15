import { cn } from '@/lib/cn'

interface WaveformProps {
  bars?: number
  tone?: 'accent' | 'danger'
  className?: string
}

/** Animated level bars. Real mic/TTS levels replace the CSS loop in F3. */
export function Waveform({ bars = 5, tone = 'accent', className }: WaveformProps) {
  return (
    <span className={cn('flex h-4 items-center gap-[3px]', className)} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={cn(
            'animate-wave h-full w-[3px] rounded-full',
            tone === 'danger' ? 'bg-danger' : 'bg-accent',
          )}
          style={{ animationDelay: `${(i * 137) % 700}ms` }}
        />
      ))}
    </span>
  )
}
