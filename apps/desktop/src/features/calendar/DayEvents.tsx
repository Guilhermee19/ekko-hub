import { MapPin, Video } from 'lucide-react'
import { backend, type CalendarEvent } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/primitives'
import { clock, isOngoing } from './agenda'
import { dayLabel } from './month'

export function JoinButton({ event }: { event: CalendarEvent }) {
  if (!event.meetLink) return null
  const link = event.meetLink
  return (
    <Button size="sm" variant="primary" onClick={() => void backend.openExternal(link)}>
      <Video className="size-3.5" aria-hidden /> Entrar
    </Button>
  )
}

/** What the time column says for `e` on the day that starts at `day`. */
function when(e: CalendarEvent, day: number): string {
  if (e.allDay) return 'dia todo'
  // A multi-day event that began on an earlier day.
  return e.startMs < day ? 'continua' : clock(e.startMs)
}

/** Everything marked on the selected day, in order. */
export function DayEvents({
  day,
  events,
  now,
}: {
  day: number
  events: CalendarEvent[]
  now: number
}) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <h2 className="text-[13px] font-semibold">{dayLabel(day)}</h2>
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-soft px-3 py-4 text-center text-[12px] text-muted">
          Nada marcado neste dia.
        </p>
      ) : (
        <ul className="divide-y divide-border-soft rounded-xl border border-border-soft bg-surface">
          {events.map((e) => {
            const ongoing = !e.allDay && isOngoing(e, now)
            return (
              <li
                key={e.id}
                className={cn('flex items-center gap-3 px-3 py-2', e.endMs <= now && 'opacity-50')}
              >
                <div
                  className={cn(
                    'w-14 shrink-0 text-[12px] tabular-nums',
                    ongoing ? 'font-semibold text-accent' : e.allDay && 'text-muted',
                  )}
                >
                  {ongoing ? 'agora' : when(e, day)}
                  {!e.allDay && !ongoing && e.startMs >= day && (
                    <span className="block text-[10px] text-muted">até {clock(e.endMs)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{e.title}</div>
                  <div className="flex items-center gap-1 truncate text-[11px] text-muted">
                    {e.location && <MapPin className="size-3 shrink-0" aria-hidden />}
                    <span className="truncate">{e.location ?? e.calendarName}</span>
                  </div>
                </div>
                {e.endMs > now && <JoinButton event={e} />}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
