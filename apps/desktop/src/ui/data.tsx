import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Screen title row used by every panel page. */
interface PageHeaderProps {
  title: string
  hint?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, hint, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-[18px] font-semibold">{title}</h1>
        {hint && <p className="text-[12px] text-muted">{hint}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  )
}

type BadgeTone = 'muted' | 'accent' | 'danger'

const BADGE: Record<BadgeTone, string> = {
  muted: 'border-border-soft text-muted',
  accent: 'border-accent/30 bg-accent/10 text-accent',
  danger: 'border-danger/30 bg-danger/10 text-danger',
}

export function Badge({ tone = 'muted', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-px text-[10px] font-medium',
        BADGE[tone],
      )}
    >
      {children}
    </span>
  )
}

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: ReactNode
  /** Small line under the value ("2 atrasadas", "próximo às 15:00"). */
  sub?: ReactNode
  /** 0..1 shows a thin progress bar at the bottom. */
  progress?: number
  onClick?: () => void
}

/** Home-style card: icon + label, big value, optional progress (Kobi cards). */
export function StatCard({ icon: Icon, label, value, sub, progress, onClick }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex h-full w-full flex-col gap-1 overflow-hidden rounded-xl border border-border-soft bg-surface p-3 text-left',
        onClick && 'transition-colors hover:border-accent/30 hover:bg-surface-hover',
      )}
    >
      <span className="flex items-center gap-1.5 text-muted">
        <Icon className="size-3.5" />
        <span className="label-hud">{label}</span>
      </span>
      <span className="text-[20px] font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
      {progress !== undefined && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-border-soft">
          <span
            className="block h-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
          />
        </span>
      )}
    </Tag>
  )
}

interface ProgressRingProps {
  /** 0..1 */
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
}

/** Circular progress (Meu PC check, Pomodoro, habits). */
export function ProgressRing({ value, size = 96, stroke = 6, children }: ProgressRingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border-soft"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="hud-glow stroke-accent text-accent transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
      )}
    </div>
  )
}

/** Friendly empty list state. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon
  title: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon className="size-6 text-muted" />
      <div className="text-[13px] font-medium">{title}</div>
      {hint && <div className="max-w-xs text-[12px] text-muted">{hint}</div>}
    </div>
  )
}
