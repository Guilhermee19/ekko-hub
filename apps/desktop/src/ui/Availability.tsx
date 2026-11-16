import { Construction, Hourglass } from 'lucide-react'
import { STATUS_LABEL, type Availability } from '@/lib/availability'
import { cn } from '@/lib/cn'

/** Tiny "Em breve" / "Em parte" tag for nav items. Nothing for live features. */
export function SoonTag({ availability }: { availability: Availability }) {
  if (availability.status === 'live') return null
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-1.5 py-px text-[9px] font-medium tracking-wide uppercase',
        availability.status === 'soon'
          ? 'border-border-soft text-muted'
          : 'border-accent/30 text-accent/80',
      )}
    >
      {STATUS_LABEL[availability.status]}
    </span>
  )
}

/** Banner at the top of a page/section that is not fully real yet. */
export function SoonBanner({
  availability,
  className,
}: {
  availability: Availability
  className?: string
}) {
  if (availability.status === 'live' || !availability.note) return null
  const soon = availability.status === 'soon'
  const Icon = soon ? Hourglass : Construction
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3 py-2 text-[12px]',
        soon
          ? 'border-border-soft bg-surface text-muted'
          : 'border-accent/25 bg-accent/5 text-content',
        className,
      )}
    >
      <Icon className={cn('mt-0.5 size-3.5 shrink-0', soon ? 'text-muted' : 'text-accent')} />
      <span className="min-w-0">
        <span className="font-medium text-content">
          {STATUS_LABEL[availability.status]}
          {availability.phase && ` · ${availability.phase}`}
        </span>
        {' — '}
        {availability.note}
      </span>
    </div>
  )
}
