import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Season } from './season'

// Props resting on the bottom edge of the notch bar, beside Ekko: gifts at Christmas, a
// mask at Carnival, eggs and a hopping bunny at Easter, a jack-o'-lantern at
// Halloween. Placed from the bar's center, so they hug the eyes on any width; each
// drawing sits on the bottom of its box (xMidYMax). Colors are the --season-* tokens.

const fill = (name: string) => ({ fill: `var(--season-${name})` })

/** A gift box: body, ribbon cross and a bow. */
function Gift({ box, ribbon }: { box: string; ribbon: string }) {
  return (
    <svg viewBox="0 0 12 12" preserveAspectRatio="xMidYMax meet" className="size-full">
      <rect x="1" y="4" width="10" height="7.5" rx="1" style={fill(box)} />
      <rect x="0.4" y="3" width="11.2" height="2.6" rx="0.8" style={fill(box)} />
      <rect x="5.1" y="3" width="1.8" height="8.5" style={fill(ribbon)} />
      <rect x="0.4" y="3.6" width="11.2" height="1.4" style={fill(ribbon)} />
      <path d="M6 3 C3.6 0.4 1.8 2.6 6 3 C10.2 2.6 8.4 0.4 6 3 Z" style={fill(ribbon)} />
    </svg>
  )
}

/** Jack-o'-lantern with a candle-lit face (the face flickers, see season.css). */
function Pumpkin() {
  return (
    <svg viewBox="0 0 16 14" preserveAspectRatio="xMidYMax meet" className="size-full">
      <path
        d="M8 3 Q8.4 0.6 10.2 0.4"
        style={{ stroke: 'var(--season-green)', fill: 'none' }}
        strokeWidth="1.4"
      />
      <ellipse cx="5" cy="8.4" rx="4.2" ry="5.2" style={fill('orange')} />
      <ellipse cx="11" cy="8.4" rx="4.2" ry="5.2" style={fill('orange')} />
      <ellipse cx="8" cy="8.4" rx="4.4" ry="5.5" style={fill('pumpkin')} />
      <g className="season-candle" style={fill('gold')}>
        <path d="M4.2 7.4 L6 5.4 L7 7.6 Z" />
        <path d="M9 7.6 L10 5.4 L11.8 7.4 Z" />
        <path d="M4.6 9.6 Q8 12.8 11.4 9.6 L10 10.2 L9 9.4 L8 10.4 L7 9.4 L6 10.2 Z" />
      </g>
    </svg>
  )
}

/** Masquerade mask with a feather. */
function Mask() {
  return (
    <svg viewBox="0 0 20 10" preserveAspectRatio="xMidYMax meet" className="size-full">
      <path
        d="M1 3.2 Q5.5 0 10 3.2 Q14.5 0 19 3.2 Q19.6 8.4 14.6 9 Q11.6 9.2 10 6.6 Q8.4 9.2 5.4 9 Q0.4 8.4 1 3.2 Z"
        style={{ fill: 'var(--season-violet)', stroke: 'var(--season-gold)' }}
        strokeWidth="0.7"
      />
      <ellipse cx="5.6" cy="5" rx="2.2" ry="1.4" style={fill('plum')} />
      <ellipse cx="14.4" cy="5" rx="2.2" ry="1.4" style={fill('plum')} />
      <path d="M18 3 Q21 -1 19.6 -3.4 Q19 0 17 2.2 Z" style={fill('teal')} />
    </svg>
  )
}

/** Easter bunny silhouette sitting up (hops in and out, see season.css). */
function Bunny() {
  return (
    <svg viewBox="0 0 12 12" preserveAspectRatio="xMidYMax meet" className="season-bunny size-full">
      <g style={fill('fur')}>
        <ellipse cx="4.4" cy="2.6" rx="1" ry="2.6" transform="rotate(-10 4.4 2.6)" />
        <ellipse cx="6.6" cy="2.6" rx="1" ry="2.6" transform="rotate(12 6.6 2.6)" />
        <circle cx="5.6" cy="6" r="2.2" />
        <ellipse cx="6.4" cy="9.4" rx="3.4" ry="2.4" />
        <circle cx="9.6" cy="9.6" r="1" />
      </g>
      <ellipse
        cx="4.4"
        cy="2.8"
        rx="0.4"
        ry="1.7"
        style={fill('pink')}
        transform="rotate(-10 4.4 2.8)"
      />
      <circle cx="4.6" cy="5.6" r="0.4" style={fill('plum')} />
    </svg>
  )
}

/** A small painted Easter egg, standing up. */
function Egg({ color, band }: { color: string; band: string }) {
  return (
    <svg viewBox="0 0 8 10" preserveAspectRatio="xMidYMax meet" className="size-full">
      <path
        d="M4 0.4 C6.6 0.4 7.8 4.6 7.8 6.4 C7.8 8.6 6 9.8 4 9.8 C2 9.8 0.2 8.6 0.2 6.4 C0.2 4.6 1.4 0.4 4 0.4 Z"
        style={fill(color)}
      />
      <path
        d="M0.5 5.2 Q2.2 4.2 4 5.2 Q5.8 6.2 7.5 5.2 L7.7 6.8 Q5.8 7.8 4 6.8 Q2.2 5.8 0.3 6.8 Z"
        style={fill(band)}
      />
    </svg>
  )
}

const PROPS: Partial<Record<Season, { at: string; size: number; node: ReactNode }[]>> = {
  christmas: [
    { at: 'calc(50% - 50px)', size: 13, node: <Gift box="red" ribbon="gold" /> },
    { at: 'calc(50% - 38px)', size: 9, node: <Gift box="green" ribbon="red" /> },
    { at: 'calc(50% + 29px)', size: 11, node: <Gift box="gold" ribbon="red" /> },
  ],
  halloween: [{ at: 'calc(50% - 50px)', size: 15, node: <Pumpkin /> }],
  carnival: [{ at: 'calc(50% - 52px)', size: 16, node: <Mask /> }],
  easter: [
    { at: 'calc(50% - 50px)', size: 7, node: <Egg color="pastel-pink" band="pastel-blue" /> },
    { at: 'calc(50% - 43px)', size: 6, node: <Egg color="pastel-yellow" band="pastel-pink" /> },
    { at: 'calc(50% + 42px)', size: 6, node: <Egg color="pastel-green" band="pastel-yellow" /> },
    { at: 'calc(50% + 24px)', size: 12, node: <Bunny /> },
  ],
}

export function SeasonProps({ season, shown }: { season: Season; shown: boolean }) {
  const items = PROPS[season]
  if (!items) return null
  return (
    <span
      className={cn(
        'absolute inset-0 transition-opacity duration-500',
        shown ? 'opacity-100' : 'opacity-0',
      )}
    >
      {items.map((p) => (
        <span
          key={p.at}
          className="season-prop absolute bottom-0"
          style={{ left: p.at, width: p.size, height: p.size }}
        >
          {p.node}
        </span>
      ))}
    </span>
  )
}
