import {
  Cpu,
  Gauge,
  HardDrive,
  MemoryStick,
  Thermometer,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { HistoryPoint, SystemSnapshot } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { formatBytes, formatRate, formatUptime, systemDisk, temperatureCard } from './metrics'
import { Sparkline } from './Sparkline'
import { useMyPc } from './store'

interface Card {
  key: string
  icon: LucideIcon
  label: string
  /** null = unavailable on this PC. */
  value: string | null
  unit?: string
  sub: string
  series: number[]
  domain: [number, number]
  hot?: boolean
}

const pct = (v: number) => Math.round(v).toString()

function cards(s: SystemSnapshot, h: HistoryPoint[]): Card[] {
  const ram = s.memory.total ? (s.memory.used / s.memory.total) * 100 : 0
  const disk = systemDisk(s)
  const diskUsed = disk && disk.total ? ((disk.total - disk.available) / disk.total) * 100 : null
  const net = h.map((p) => p.net)
  const temp = temperatureCard(s)
  const gpuSub =
    s.gpu?.vramUsed != null && s.gpu.vramTotal
      ? `VRAM ${formatBytes(s.gpu.vramUsed)} de ${formatBytes(s.gpu.vramTotal)}`
      : (s.gpu?.name ?? 'Sem contadores de GPU')
  return [
    {
      key: 'cpu',
      icon: Cpu,
      label: 'CPU',
      value: pct(s.cpu.total),
      unit: '%',
      sub: `${s.cpu.cores.length} núcleos · ligado há ${formatUptime(s.uptimeSecs)}`,
      series: h.map((p) => p.cpu),
      domain: [0, 100],
      hot: s.cpu.total > 85,
    },
    {
      key: 'ram',
      icon: MemoryStick,
      label: 'Memória',
      value: pct(ram),
      unit: '%',
      sub: `${formatBytes(s.memory.used)} de ${formatBytes(s.memory.total)}`,
      series: h.map((p) => p.ram),
      domain: [0, 100],
      hot: ram > 85,
    },
    {
      key: 'gpu',
      icon: Gauge,
      label: 'GPU',
      value: s.gpu ? pct(s.gpu.usage) : null,
      unit: '%',
      sub: s.gpu ? gpuSub : 'Indisponível neste PC',
      series: h.flatMap((p) => (p.gpu == null ? [] : [p.gpu])),
      domain: [0, 100],
      hot: (s.gpu?.usage ?? 0) > 90,
    },
    {
      key: 'disk',
      icon: HardDrive,
      label: `Disco (${disk?.mount.replace('\\', '') ?? '?'})`,
      value: diskUsed == null ? null : pct(diskUsed),
      unit: '%',
      sub: disk ? `${formatBytes(disk.available)} livres` : 'Indisponível',
      series: h.flatMap((p) => (p.disk == null ? [] : [p.disk])),
      domain: [0, 100],
      hot: diskUsed != null && diskUsed > 90,
    },
    {
      key: 'net',
      icon: Wifi,
      label: 'Rede',
      value: formatRate(s.network.rxPerSec + s.network.txPerSec),
      sub: `↓ ${formatRate(s.network.rxPerSec)} · ↑ ${formatRate(s.network.txPerSec)}`,
      series: net,
      domain: [0, Math.max(1, ...net)],
    },
    {
      key: 'temp',
      icon: Thermometer,
      label: 'Temperatura',
      value: temp.value == null ? null : pct(temp.value),
      unit: '°C',
      sub: temp.sub,
      series: h.flatMap((p) => (p.temp == null ? [] : [p.temp])),
      domain: [30, 100],
      hot: temp.hot,
    },
  ]
}

/** Live status cards with ~90 s sparklines from the backend history. */
export function StatusGrid({ compact }: { compact: boolean }) {
  const snapshot = useMyPc((s) => s.snapshot)
  const history = useMyPc((s) => s.history)
  if (!snapshot) {
    return (
      <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-3')} aria-busy>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-[112px] animate-pulse rounded-xl border border-border-soft bg-surface"
          />
        ))}
      </div>
    )
  }
  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-3')}>
      {cards(snapshot, history).map((card) => (
        <MetricCard key={card.key} card={card} />
      ))}
    </div>
  )
}

function MetricCard({ card }: { card: Card }) {
  const { icon: Icon } = card
  return (
    <div className="flex flex-col gap-1 overflow-hidden rounded-xl border border-border-soft bg-surface p-3">
      <span className="flex items-center gap-1.5 text-muted">
        <Icon className="size-3.5" aria-hidden />
        <span className="label-hud truncate">{card.label}</span>
      </span>
      {card.value == null ? (
        <span className="text-[13px] leading-[30px] text-muted">indisponível</span>
      ) : (
        <span
          className={cn(
            'font-mono text-[20px] font-semibold tabular-nums',
            card.hot && 'text-danger',
          )}
        >
          {card.value}
          {card.unit && (
            <span className="ml-0.5 text-[11px] font-normal text-muted">{card.unit}</span>
          )}
        </span>
      )}
      <Sparkline
        values={card.series}
        domain={card.domain}
        label={`${card.label}: últimos ${card.series.length} registros`}
      />
      <span className="truncate text-[11px] text-muted" title={card.sub}>
        {card.sub}
      </span>
    </div>
  )
}
