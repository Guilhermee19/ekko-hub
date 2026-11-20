import { CalendarOff, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { backend, type CalendarEvent } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useIntegrations } from '@/features/integrations/store'
import { useNow } from '@/surfaces/shared/useNow'
import { EmptyState, PageHeader } from '@/ui/data'
import { Button, IconButton } from '@/ui/primitives'
import { clock, isOngoing, nextEvent, relative } from './agenda'
import { DayEvents, JoinButton } from './DayEvents'
import { eventsOn, monthLabel, monthOf, sameMonth, shiftMonth, startOfDay } from './month'
import { MonthGrid } from './MonthGrid'
import { useCalendar } from './store'

/** The agenda as a wall calendar: the month, and the selected day's events beside it. */
export function AgendaPage() {
  const { events, month, monthEvents, connected, loading, error, refresh, showMonth } =
    useCalendar()
  const now = useNow(true, 30_000)
  const today = startOfDay(now)
  const [selected, setSelected] = useState(today)

  useEffect(() => {
    void useIntegrations.getState().refresh()
  }, [])
  // Opening the page always starts on the current month, fresh.
  useEffect(() => {
    if (connected) void useCalendar.getState().showMonth(monthOf(Date.now()))
  }, [connected])

  const next = nextEvent(events, now)
  const go = (delta: number) => {
    const target = shiftMonth(month, delta)
    // Keep a day selected in the month on screen: today when it is there, else the 1st.
    const first = new Date(target.year, target.month, 1).getTime()
    setSelected(sameMonth(target, monthOf(today)) ? today : first)
    void showMonth(target)
  }
  const goToday = () => {
    setSelected(today)
    void showMonth(monthOf(today))
  }
  const select = (day: number) => {
    setSelected(day)
    // A dimmed day of the neighbour month takes you there.
    if (!sameMonth(monthOf(day), month)) void showMonth(monthOf(day))
  }

  return (
    <div className="animate-rise-in @container flex flex-col gap-3">
      <PageHeader
        title="Agenda"
        hint={
          connected
            ? next
              ? `${next.title} ${relative(next, now)}`
              : 'Nada marcado nas próximas 24 h'
            : 'Google Agenda desconectado'
        }
        actions={
          connected && (
            <IconButton label="Atualizar agenda" disabled={loading} onClick={() => void refresh()}>
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
            </IconButton>
          )
        }
      />

      {!connected ? (
        <Disconnected />
      ) : (
        <>
          {next && <NextCard event={next} now={now} />}
          <div className="flex items-center gap-1">
            <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold" aria-live="polite">
              {monthLabel(month)}
            </h2>
            {!(sameMonth(month, monthOf(today)) && selected === today) && (
              <Button size="sm" variant="subtle" onClick={goToday}>
                Hoje
              </Button>
            )}
            <IconButton label="Mês anterior" onClick={() => go(-1)}>
              <ChevronLeft className="size-4" aria-hidden />
            </IconButton>
            <IconButton label="Próximo mês" onClick={() => go(1)}>
              <ChevronRight className="size-4" aria-hidden />
            </IconButton>
          </div>
          <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-start">
            <div className="min-w-0 @3xl:flex-1">
              <MonthGrid
                month={month}
                events={monthEvents}
                today={today}
                selected={selected}
                onSelect={select}
              />
            </div>
            <div className="min-w-0 @3xl:w-72 @3xl:shrink-0">
              <DayEvents day={selected} events={eventsOn(monthEvents, selected)} now={now} />
            </div>
          </div>
          {error && <p className="text-[11px] text-danger">Não consegui ler a agenda: {error}</p>}
        </>
      )}
    </div>
  )
}

function Disconnected() {
  return (
    <div className="flex flex-col items-center gap-3">
      <EmptyState
        icon={CalendarOff}
        title="Conecte sua Google Agenda"
        hint="Em Configurações → Conexões. O Ekko avisa 10 minutos antes de cada reunião."
      />
      <Button variant="primary" onClick={() => void backend.openSettings()}>
        Abrir Conexões
      </Button>
    </div>
  )
}

function NextCard({ event, now }: { event: CalendarEvent; now: number }) {
  const ongoing = isOngoing(event, now)
  return (
    <section className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-accent">
          {ongoing ? 'Acontecendo agora' : `Próximo, ${relative(event, now)}`}
        </div>
        <div className="truncate text-[14px] font-semibold">{event.title}</div>
        <div className="truncate text-[12px] text-muted">
          {clock(event.startMs)} – {clock(event.endMs)} · {event.calendarName}
        </div>
      </div>
      <JoinButton event={event} />
    </section>
  )
}
