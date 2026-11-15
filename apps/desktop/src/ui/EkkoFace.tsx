import { cn } from '@/lib/cn'
import type { Phase } from '@/stores/assistant'

interface EkkoFaceProps {
  phase: Phase
  className?: string
}

/**
 * Placeholder avatar until F8: a tiny HUD ring with two eyes whose shape follows the
 * assistant phase. Gives the pill a "someone lives here" feel like Kobi's mascot.
 */
export function EkkoFace({ phase, className }: EkkoFaceProps) {
  const eyes = EYES[phase]
  return (
    <svg viewBox="0 0 32 32" className={cn('text-accent', className)} aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r="14.5"
        fill="var(--color-surface)"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <circle
        cx="16"
        cy="16"
        r="14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="22 70"
        className={cn('hud-rotor', phase === 'thinking' ? 'animate-hud-fast' : 'opacity-0')}
      />
      <g fill="currentColor" className="hud-glow">
        <rect x={10.5} y={16 - eyes.h / 2} width="4" height={eyes.h} rx="2" />
        <rect x={17.5} y={16 - eyes.h / 2} width="4" height={eyes.h} rx="2" />
      </g>
      {phase === 'speaking' && (
        <rect
          x="13"
          y="22"
          width="6"
          height="1.6"
          rx="0.8"
          fill="currentColor"
          opacity="0.8"
          className="animate-wave"
        />
      )}
    </svg>
  )
}

const EYES: Record<Phase, { h: number }> = {
  idle: { h: 6 },
  listening: { h: 8 },
  thinking: { h: 2.4 },
  speaking: { h: 6 },
}
