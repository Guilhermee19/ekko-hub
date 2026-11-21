import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import type { Season } from './season'
import { SeasonProps } from './SeasonProps'

// The holiday scene behind the notch bar: moving bits (snow, fireworks, hearts, bats)
// plus, for some holidays, props resting on the bottom edge (gifts, eggs, a pumpkin). Fills
// its positioned parent; never takes the mouse. Motion in theme/season.css.

type Kind = 'snow' | 'confetti' | 'heart' | 'bat' | 'firework'

const c = (name: string) => `var(--season-${name})`

/** Easter has no moving bits: its eggs sit in the corners (SeasonProps). */
const SKY: Partial<Record<Season, { kind: Kind; count: number; colors: string[] }>> = {
  christmas: { kind: 'snow', count: 16, colors: [c('snow')] },
  newYear: { kind: 'firework', count: 4, colors: [c('gold'), c('rose'), c('cyan'), c('lime')] },
  carnival: {
    kind: 'confetti',
    count: 14,
    colors: [c('violet'), c('gold'), c('teal'), c('rose')],
  },
  valentines: { kind: 'heart', count: 8, colors: [c('rose'), c('pink')] },
  halloween: { kind: 'bat', count: 4, colors: [c('lavender')] },
}

/** Stable pseudo-random 0..1 per particle, so renders never reshuffle. */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Seconds per loop: bats cross slowly, fireworks pop then wait, the rest fall. */
const PACE: Record<Kind, number> = { snow: 4, confetti: 4, heart: 4, bat: 9, firework: 2.6 }

export function SeasonSky({
  season,
  props = true,
  className,
}: {
  season: Season
  /** Gifts / pumpkin at the bottom; hidden while the bar shows text next to the eyes. */
  props?: boolean
  className?: string
}) {
  const sky = SKY[season]
  return (
    <span
      aria-hidden
      className={cn('season-sky pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <SeasonProps season={season} shown={props} />
      {season === 'christmas' && <Lights />}
      {sky &&
        Array.from({ length: sky.count }, (_, i) => {
          const { kind, count, colors } = sky
          const style = {
            left: `${(i + rand(i, 1)) * (100 / count)}%`,
            animationDuration: `${PACE[kind] + rand(i, 2) * 4}s`,
            animationDelay: `${-rand(i, 3) * 8}s`,
            '--drift': `${(rand(i, 4) - 0.5) * 24}px`,
            '--size': `${kind === 'snow' ? 1.5 + rand(i, 5) * 2 : 3 + rand(i, 5) * 2}px`,
            '--top': `${10 + rand(i, 6) * 60}%`,
            color: colors[i % colors.length],
          } as CSSProperties
          return (
            <span key={i} className={`season-bit season-${kind}`} style={style}>
              {kind === 'heart' && '♥'}
              {kind === 'bat' && <Bat />}
              {kind === 'firework' && <Burst />}
            </span>
          )
        })}
    </span>
  )
}

/** Eight sparks flying out from one point (they inherit the burst's timing). */
function Burst() {
  return (
    <>
      {Array.from({ length: 8 }, (_, k) => (
        <span
          key={k}
          className="season-spark"
          style={{ '--angle': `${k * 45}deg` } as CSSProperties}
        />
      ))}
    </>
  )
}

/** Christmas string lights drooping along the top edge; bulbs cycle colors, out of step. */
const BULBS = 11

function Lights() {
  const drop = (i: number) => (i % 2 ? 7 : 4)
  return (
    <>
      <svg
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 h-2.5 w-full"
      >
        <path
          d={`M0 1 ${Array.from({ length: BULBS }, (_, i) => {
            const x = ((i + 0.5) / BULBS) * 100
            return `Q${x - 100 / BULBS / 2} ${drop(i) + 2} ${x} ${drop(i)}`
          }).join(' ')} L100 1`}
          fill="none"
          stroke="var(--season-fur)"
          strokeOpacity="0.25"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {Array.from({ length: BULBS }, (_, i) => (
        <span
          key={i}
          className="season-bulb"
          style={{
            left: `${((i + 0.5) / BULBS) * 100}%`,
            top: `${drop(i) * 0.25 + 1}px`,
            animationDelay: `${-i * 0.9}s`,
          }}
        />
      ))}
    </>
  )
}

function Bat() {
  return (
    <svg viewBox="0 0 12 6" className="size-full" fill="currentColor">
      <path d="M6 2 Q4.5 0 2.5 1.2 Q1.2 0.6 0 1.6 Q1.6 2.4 2 4 Q3.6 3 6 5 Q8.4 3 10 4 Q10.4 2.4 12 1.6 Q10.8 0.6 9.5 1.2 Q7.5 0 6 2 Z" />
    </svg>
  )
}
