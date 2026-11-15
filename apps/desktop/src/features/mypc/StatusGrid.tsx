import {
  Cpu,
  Gauge,
  HardDrive,
  MemoryStick,
  Thermometer,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useNow } from '@/surfaces/shared/useNow'
import { metricSeries, sparkPoints, type MetricKey } from './metrics'

interface CardDef {
  key: MetricKey
  icon: LucideIcon
  label: string
  /** Sparkline domain; percentages use 0..100. */
  domain: [number, number]
  value: (v: number) => string
  unit: string
  sub: (v: number) => string
}

const pt = (v: number, digits = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const CARDS: CardDef[] = [
  {
    key: 'cpu',
    icon: Cpu,
    label: 'CPU',
    domain: [0, 100],
    value: (v) => pt(v),
    unit: '%',
    sub: () => 'Ryzen 7 5800X · 8 núcleos',
  },
  {
    key: 'ram',
    icon: MemoryStick,
    label: 'RAM',
    domain: [0, 100],
    value: (v) => pt(v),
    unit: '%',
    sub: (v) => `${pt((v / 100) * 16, 1)} de 16 GB`,
  },
  {
    key: 'gpu',
    icon: Gauge,
    label: 'GPU',
    domain: [0, 100],
    value: (v) => pt(v),
    unit: '%',
    sub: () => 'RTX 3060 · 12 GB',
  },
  {
    key: 'disk',
    icon: HardDrive,
    label: 'Disco (C:)',
    domain: [0, 100],
    value: (v) => pt(v),
    unit: '%',
    sub: (v) => `${pt(((100 - v) / 100) * 490)} GB livres`,
  },
  {
    key: 'net',
    icon: Wifi,
    label: 'Rede',
    domain: [0, 12],
    value: (v) => pt(v, 1),
    unit: 'Mb/s',
    sub: () => 'Wi-Fi · Casa_5G',
  },
  {
    key: 'temp',
    icon: Thermometer,
    label: 'Temperatura',
    domain: [30, 90],
    value: (v) => pt(v),
    unit: '°C',
    sub: (v) => (v > 70 ? 'Esquentando' : 'Normal'),
  },
]

/** Live status cards; values are derived from the clock each tick (mock telemetry). */
export function StatusGrid({ compact }: { compact: boolean }) {
  const now = useNow(true, 1000)
  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-3')}>
      {CARDS.map((card) => (
        <MetricCard key={card.key} card={card} series={metricSeries(card.key, now)} />
      ))}
    </div>
  )
}

function MetricCard({ card, series }: { card: CardDef; series: number[] }) {
  const { icon: Icon, domain } = card
  const current = series[series.length - 1]
  const hot = card.key === 'temp' ? current > 70 : domain[1] === 100 && current > 85
  return (
    <div className="flex flex-col gap-1 overflow-hidden rounded-xl border border-border-soft bg-surface p-3">
      <span className="flex items-center gap-1.5 text-muted">
        <Icon className="size-3.5" aria-hidden />
        <span className="label-hud truncate">{card.label}</span>
      </span>
      <span
        className={cn('font-mono text-[20px] font-semibold tabular-nums', hot && 'text-danger')}
      >
        {card.value(current)}
        <span className="ml-0.5 text-[11px] font-normal text-muted">{card.unit}</span>
      </span>
      <Sparkline
        values={series}
        domain={domain}
        label={`${card.label}: últimos ${series.length} segundos`}
      />
      <span className="truncate text-[11px] text-muted">{card.sub(current)}</span>
    </div>
  )
}

const W = 100
const H = 24

function Sparkline({
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
      <polygon points={`0,${H} ${points} ${W},${H}`} className="fill-accent/10" />
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-accent"
      />
    </svg>
  )
}
