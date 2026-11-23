import { CalendarClock, CalendarDays, Check } from 'lucide-react'
import { useCalendar } from '@/features/calendar/store'
import { cn } from '@/lib/cn'
import type { Activity } from '@/stores/assistant'

type EventActivity = Extract<Activity, { kind: 'event' }>

/**
 * Pill chip for the coming/running event. Once it started without a confirmation it
 * turns "atrasado" and stays until "Confirmar" (then it leaves the notch).
 */
export function EventChip({
  activity,
  now,
  when,
}: {
  activity: EventActivity
  now: number
  when: string
}) {
  const ack = useCalendar((s) => s.ack)
  const late = now >= activity.startsAt
  const lateMin = Math.floor((now - activity.startsAt) / 60_000)
  const Icon = late ? CalendarClock : CalendarDays
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px]">
      <Icon
        className={cn('size-3.5 shrink-0', late ? 'text-danger' : 'text-accent')}
        aria-label={late ? 'Começou e ainda não foi confirmado' : undefined}
      />
      <span className="truncate">{activity.title}</span>
      <span
        className={cn(
          'ml-auto shrink-0 font-mono text-[11px] tabular-nums',
          late ? 'text-danger' : 'text-accent',
        )}
      >
        {late ? (lateMin < 1 ? 'agora' : `há ${lateMin} min`) : when}
      </span>
      <button
        type="button"
        title="Confirmar: já vi"
        aria-label={`Confirmar ${activity.title}`}
        onClick={(e) => {
          e.stopPropagation()
          ack({ id: activity.id, startMs: activity.startsAt })
        }}
        className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-hover text-muted transition-colors hover:text-content focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
      >
        <Check className="size-3" aria-hidden />
      </button>
    </span>
  )
}
