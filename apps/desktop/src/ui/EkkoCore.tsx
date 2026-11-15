import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

interface EkkoCoreProps {
  label: string
  active?: boolean
  /** 0..1, already curved by the caller (audio level). */
  level?: number
  className?: string
}

/** HUD core ported from Jarvis: concentric rings spinning at different speeds. */
export function EkkoCore({ label, active = true, level = 0, className }: EkkoCoreProps) {
  const spin = (animation: string) => cn('hud-rotor', active && animation)
  return (
    <svg
      viewBox="0 0 200 200"
      style={{ '--nivel': level } as CSSProperties}
      className={cn('hud-core-live overflow-visible text-accent', className)}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="ekko-core-glow">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
          <stop offset="70%" stopColor="var(--color-accent)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="86" fill="url(#ekko-core-glow)" />
      <g stroke="currentColor" strokeWidth="1.2" opacity="0.5">
        <path d="M100 14v9M100 177v9M14 100h9M177 100h9" />
      </g>
      <circle
        cx="100"
        cy="100"
        r="92"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="1 6"
        opacity="0.3"
        className={spin('animate-hud-slow')}
      />
      <circle
        cx="100"
        cy="100"
        r="80"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="2 14"
        opacity="0.4"
        className={spin('animate-hud-medium')}
      />
      <circle
        cx="100"
        cy="100"
        r="70"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="58 161.9"
        opacity="0.75"
        className={cn(spin('animate-hud-fast'), 'hud-glow')}
      />
      <circle
        cx="100"
        cy="100"
        r="56"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      <circle
        cx="100"
        cy="100"
        r="56"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="96 255.8"
        className={cn(spin('animate-hud-medium'), 'hud-glow')}
      />
      <circle cx="100" cy="100" r="46" fill="var(--color-base)" opacity="0.85" />
      <circle
        cx="100"
        cy="100"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.4"
      />
      <text
        x="100"
        y="106"
        textAnchor="middle"
        textLength="72"
        lengthAdjust="spacingAndGlyphs"
        className="fill-content text-[16px] font-light uppercase"
      >
        {label}
      </text>
    </svg>
  )
}
