import { cn } from '@/lib/cn'
import type { AvatarColor, AvatarStyle } from '@/lib/ipc'
import type { Phase } from '@/stores/assistant'
import { useSettings } from '@/stores/settings'

interface EkkoFaceProps {
  phase: Phase
  className?: string
  /** Overrides for previews; by default the face follows Configurações > Avatar. */
  eyes?: AvatarStyle
  color?: AvatarColor
}

const COLOR: Record<AvatarColor, string> = {
  accent: 'text-accent',
  strong: 'text-accent-strong',
  neutral: 'text-content',
}

/**
 * Placeholder avatar until F8: a tiny HUD ring with two eyes whose shape follows the
 * assistant phase. Gives the pill a "someone lives here" feel like Kobi's mascot.
 */
export function EkkoFace({ phase, className, eyes, color }: EkkoFaceProps) {
  const style = useSettings((s) => s.settings.appearance.avatarStyle)
  const tone = useSettings((s) => s.settings.appearance.avatarColor)
  const h = EYE_H[phase]
  return (
    <svg viewBox="0 0 32 32" className={cn(COLOR[color ?? tone], className)} aria-hidden="true">
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
        <Eyes style={eyes ?? style} h={h} />
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

/** Eye pair for each style; `h` is the phase height (blink-like squint when thinking). */
function Eyes({ style, h }: { style: AvatarStyle; h: number }) {
  switch (style) {
    case 'round': {
      const ry = Math.max(0.9, (h / 2) * 0.8)
      return (
        <>
          <ellipse cx="12.5" cy="16" rx="2.3" ry={ry} />
          <ellipse cx="19.5" cy="16" rx="2.3" ry={ry} />
        </>
      )
    }
    case 'line': {
      const lh = Math.min(h, 1.8)
      return (
        <>
          <rect x={9.5} y={16 - lh / 2} width="5.5" height={lh} rx={lh / 2} />
          <rect x={17} y={16 - lh / 2} width="5.5" height={lh} rx={lh / 2} />
        </>
      )
    }
    case 'pixel': {
      const ph = Math.min(h, 4)
      return (
        <>
          <rect x={10.5} y={16 - ph / 2} width="4" height={ph} />
          <rect x={17.5} y={16 - ph / 2} width="4" height={ph} />
        </>
      )
    }
    case 'visor': {
      const vh = Math.min(h, 3.6)
      return <rect x={8.5} y={16 - vh / 2} width="15" height={vh} rx={vh / 2} />
    }
    default:
      return (
        <>
          <rect x={10.5} y={16 - h / 2} width="4" height={h} rx="2" />
          <rect x={17.5} y={16 - h / 2} width="4" height={h} rx="2" />
        </>
      )
  }
}

const EYE_H: Record<Phase, number> = {
  idle: 6,
  listening: 8,
  thinking: 2.4,
  speaking: 6,
}
