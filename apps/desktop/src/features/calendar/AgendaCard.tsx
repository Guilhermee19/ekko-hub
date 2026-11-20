import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useNow } from '@/surfaces/shared/useNow'
import { clock, comingUp, isOngoing, relative } from './agenda'
import { useCalendar } from './store'

/** Event lines the card shows before "+n". */
const LINES = 2

/** Início card: today as a calendar leaf and what is coming up next to it. */
export function AgendaCard({ onOpen }: { onOpen: () => void }) {
  const events = useCalendar((s) => s.events)
  const connected = useCalendar((s) => s.connected)
  const now = useNow(true, 30_000)
  const date = new Date(now)
  const coming = comingUp(events, now)
  const extra = coming.length - LINES

  return (
    <button
      type="button"
      onClick={onOpen}
      className="@container flex h-full w-full min-w-0 flex-col gap-1.5 overflow-hidden rounded-xl border border-border-soft bg-surface p-3 text-left transition-colors hover:border-accent/30 hover:bg-surface-hover"
    >
      <span className="flex w-full min-w-0 items-center gap-1.5 text-muted">
        <CalendarDays className="size-3.5 shrink-0" aria-hidden />
        <span className="label-hud truncate">Agenda</span>
        {extra > 0 && <span className="ml-auto shrink-0 text-[10px]">+{extra} depois</span>}
      </span>

      <span className="flex w-full min-w-0 items-center gap-2.5">
        {/* Calendar leaf; narrow cards (1 of 4 columns) keep only the events. */}
        <span
          className="hidden w-10 shrink-0 flex-col overflow-hidden rounded-lg border border-border-soft text-center @[11rem]:flex"
          aria-hidden
        >
          <span className="bg-accent/20 text-[9px] leading-4 font-semibold tracking-wide text-accent uppercase">
            {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
          </span>
          <span className="text-[17px] leading-6 font-semibold tabular-nums">{date.getDate()}</span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {coming.length === 0 ? (
            <>
              <span className="truncate text-[13px] font-medium">
                {connected ? 'Agenda livre' : 'Sem agenda'}
              </span>
              <span className="line-clamp-2 text-[11px] text-muted">
                {connected ? 'Nada nas próximas 24 h' : 'Conecte o Google Agenda'}
              </span>
            </>
          ) : (
            coming.slice(0, LINES).map((e, i) => {
              const ongoing = !e.allDay && isOngoing(e, now)
              return (
                <span key={e.id} className="flex min-w-0 items-baseline gap-1.5">
                  <span
                    className={cn(
                      'shrink-0 text-[11px] tabular-nums',
                      ongoing || i === 0 ? 'font-semibold text-accent' : 'text-muted',
                    )}
                  >
                    {e.allDay ? 'dia todo' : i === 0 ? relative(e, now) : clock(e.startMs)}
                  </span>
                  <span className={cn('truncate text-[12px]', i === 0 && 'font-medium')}>
                    {e.title}
                  </span>
                </span>
              )
            })
          )}
        </span>
      </span>
    </button>
  )
}
