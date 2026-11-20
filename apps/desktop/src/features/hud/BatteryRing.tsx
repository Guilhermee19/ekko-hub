import {
  Bluetooth,
  Gamepad2,
  Headphones,
  Keyboard,
  Mouse,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import type { DeviceKind } from '@/lib/ipc'
import { cn } from '@/lib/cn'

export const KIND_ICON: Record<DeviceKind, LucideIcon> = {
  headphones: Headphones,
  keyboard: Keyboard,
  mouse: Mouse,
  phone: Smartphone,
  gamepad: Gamepad2,
  other: Bluetooth,
}

const R = 8.5
const LENGTH = 2 * Math.PI * R

/** Device icon inside a donut of charge; the SVG scales with `size`. */
export function Ring({
  icon: Icon,
  percent,
  low,
  size = 36,
}: {
  icon: LucideIcon
  percent: number
  low: boolean
  size?: number
}) {
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * LENGTH
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 20 20" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="10" cy="10" r={R} fill="none" strokeWidth="2" className="stroke-border-soft" />
        <circle
          cx="10"
          cy="10"
          r={R}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${LENGTH}`}
          className={cn(
            'transition-[stroke-dasharray] duration-500',
            low ? 'stroke-danger' : 'stroke-accent',
          )}
        />
      </svg>
      <Icon
        className={cn(low ? 'text-danger' : 'text-content')}
        style={{ width: size / 2, height: size / 2 }}
        aria-hidden
      />
    </span>
  )
}
