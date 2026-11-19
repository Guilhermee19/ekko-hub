import { cn } from '@/lib/cn'
import type { Phase } from '@/stores/assistant'

interface EkkoEyesProps {
  phase: Phase
  className?: string
}

/** Eye height per phase (viewBox units): wide open listening, squinting while thinking. */
const RY: Record<Phase, number> = {
  idle: 5.4,
  listening: 6.4,
  thinking: 1.8,
  speaking: 5.4,
}

/**
 * Ekko peeking out of the notch: two glowing ovals, no ring. Blinks now and then when
 * idle and glances side to side while thinking. Size it with `className` (36×16 ratio).
 */
export function EkkoEyes({ phase, className }: EkkoEyesProps) {
  const ry = RY[phase]
  return (
    <svg
      viewBox="0 0 36 16"
      aria-hidden="true"
      className={cn(
        'ekko-eyes text-content',
        phase === 'idle' && 'animate-ekko-blink',
        phase === 'thinking' && 'animate-ekko-look',
        className,
      )}
    >
      <g fill="currentColor">
        <ellipse className="ekko-eye" cx="7.5" cy="8" rx="3.4" ry={ry} />
        <ellipse className="ekko-eye" cx="28.5" cy="8" rx="3.4" ry={ry} />
      </g>
    </svg>
  )
}
