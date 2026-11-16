import { sparkPoints } from './metrics'

const W = 100
const H = 24

/** Tiny area chart; `values` oldest first. */
export function Sparkline({
  values,
  domain,
  label,
}: {
  values: number[]
  domain: [number, number]
  label: string
}) {
  const points = sparkPoints(values, W, H, domain[0], domain[1])
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-6 w-full overflow-visible text-accent"
      role="img"
      aria-label={label}
    >
      {points && (
        <>
          <polygon points={`0,${H} ${points} ${W},${H}`} className="fill-accent/10" />
          <polyline
            points={points}
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-accent"
          />
        </>
      )}
    </svg>
  )
}
