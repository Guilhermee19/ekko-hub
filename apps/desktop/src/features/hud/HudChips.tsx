import {
  ArrowBigUp,
  ArrowBigUpDash,
  BatteryCharging,
  BatteryLow,
  BatteryMedium,
  Headphones,
  Mic,
  MicOff,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Activity, HudIcon } from '@/stores/assistant'

const ICON: Record<HudIcon, LucideIcon> = {
  caps: ArrowBigUpDash,
  capsOff: ArrowBigUp,
  mic: Mic,
  micOff: MicOff,
  brightness: Sun,
  charging: BatteryCharging,
  battery: BatteryMedium,
  batteryLow: BatteryLow,
  headphones: Headphones,
}

/** A system reaction in the pill: icon, label and, for levels, a bar. */
export function HudChip({ activity }: { activity: Extract<Activity, { kind: 'hud' }> }) {
  const Icon = ICON[activity.icon]
  const tone = activity.warn ? 'text-danger' : 'text-accent'
  return (
    <span className="animate-fade-in flex min-w-0 flex-1 items-center gap-2 text-[12.5px]">
      <Icon className={cn('size-3.5 shrink-0', tone)} aria-hidden />
      {activity.level === undefined ? (
        <span className={cn('min-w-0 truncate', activity.warn && 'text-danger')}>
          {activity.label}
        </span>
      ) : (
        <>
          <span className="sr-only">{activity.label}</span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-border-soft">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-150"
              style={{ width: `${activity.level * 100}%` }}
            />
          </span>
          <span className="font-mono text-[11px] text-muted tabular-nums">
            {Math.round(activity.level * 100)}%
          </span>
        </>
      )}
    </span>
  )
}
