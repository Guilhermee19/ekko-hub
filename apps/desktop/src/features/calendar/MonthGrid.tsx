import type { CalendarEvent } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { clock } from './agenda'
import { eventsOn, monthDays, WEEKDAYS, type MonthRef } from './month'

/** Event lines per day before "+n" (wide panel). */
const LINES = 2
/** Dots per day (narrow panel). */
const DOTS = 3

interface Props {
  month: MonthRef
  events: CalendarEvent[]
  /** Local midnight of today and of the selected day. */
  today: number
  selected: number
  onSelect: (day: number) => void
}

/** The month as a wall calendar: one cell per day with what is marked on it. */
export function MonthGrid({ month, events, today, selected, onSelect }: Props) {
  const days = monthDays(month)
  return (
    <div className="overflow-hidden rounded-xl border border-border-soft bg-surface">
      <div className="grid grid-cols-7 border-b border-border-soft">
        {WEEKDAYS.map((d) => (
          <span key={d} className="label-hud py-1.5 text-center">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => (
          <DayCell
            key={day}
            day={day}
            events={eventsOn(events, day)}
            outside={new Date(day).getMonth() !== month.month}
            today={day === today}
            past={day < today}
            selected={day === selected}
            lastRow={i >= days.length - 7}
            lastCol={i % 7 === 6}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

interface CellProps {
  day: number
  events: CalendarEvent[]
  outside: boolean
  today: boolean
  past: boolean
  selected: boolean
  lastRow: boolean
  lastCol: boolean
  onSelect: (day: number) => void
}

function DayCell({
  day,
  events,
  outside,
  today,
  past,
  selected,
  lastRow,
  lastCol,
  onSelect,
}: CellProps) {
  const date = new Date(day)
  const count = events.length
  const label = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${label}, ${count === 0 ? 'sem eventos' : count === 1 ? '1 evento' : `${count} eventos`}`}
      onClick={() => onSelect(day)}
      className={cn(
        'flex min-h-12 min-w-0 flex-col items-stretch gap-0.5 p-1 text-left transition-colors @lg:min-h-19',
        'hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none focus-visible:ring-inset',
        !lastRow && 'border-b border-border-soft',
        !lastCol && 'border-r border-border-soft',
        selected && 'bg-accent/10 hover:bg-accent/15',
        outside && 'opacity-40',
      )}
    >
      <span
        className={cn(
          'grid size-5 shrink-0 place-items-center self-center rounded-full text-[11px] tabular-nums @lg:self-start',
          today ? 'bg-accent font-semibold text-(--color-base)' : past && 'text-muted',
        )}
      >
        {date.getDate()}
      </span>

      {/* Narrow panel: dots. */}
      <span className="flex h-1.5 items-center justify-center gap-0.5 @lg:hidden" aria-hidden>
        {events.slice(0, DOTS).map((e) => (
          <span
            key={e.id}
            className={cn('size-1 rounded-full', e.allDay ? 'bg-accent' : 'bg-accent/60')}
          />
        ))}
      </span>

      {/* Wide panel: the events themselves. */}
      <span className="hidden min-w-0 flex-col gap-0.5 @lg:flex" aria-hidden>
        {events.slice(0, LINES).map((e) => (
          <span
            key={e.id}
            className={cn(
              'truncate rounded px-1 text-[10px] leading-4',
              e.allDay ? 'bg-accent/25 text-accent' : 'bg-accent/10 text-content',
            )}
          >
            {/* No hour on the following days of an event that spans several. */}
            {!e.allDay && e.startMs >= day && (
              <span className="text-muted tabular-nums">{clock(e.startMs)} </span>
            )}
            {e.title}
          </span>
        ))}
        {count > LINES && (
          <span className="px-1 text-[10px] leading-4 text-muted">+{count - LINES} mais</span>
        )}
      </span>
    </button>
  )
}
